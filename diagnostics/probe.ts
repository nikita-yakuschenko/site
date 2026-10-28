import { existsSync } from 'node:fs'
import type { Page, Request, TestInfo } from '@playwright/test'
import { captchaProviderSource, cancelledImageConsole, expectedCMSImageOptimization, navigationCancellation, runtimeSeverity, scenarioKey, webkitNavigationFetch, type Finding } from './model'

export type { Finding } from './model'

function safeUrl(raw: string) {
  try { const u = new URL(raw); return u.origin + u.pathname } catch { return raw.slice(0, 200) }
}
function scrub(value: string) {
  return value
    .replace(/https?:\/\/[^\s)'"]+/g, match => safeUrl(match))
    .replace(/(secret|token|key|password|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .slice(0, 3000)
}
function fingerprint(category: string, text: string) {
  return category + ':' + scrub(text).replace(/(?<!#)\b\d+(?:[:.]\d+)*\b/g, '#').replace(/\s+/g, ' ').slice(0, 240)
}
function reactHydration(text: string) {
  return /(?:React error #(?:418|419|423)|react\.dev\/errors\/(?:418|419|423)|hydration|hydrating|server rendered HTML|didn't match the client)/i.test(text)
}

const navigationIntents = new WeakMap<Page, () => void>()
export function beginNavigation(page: Page) { navigationIntents.get(page)?.() }

export async function diagnose(page: Page, info: TestInfo, scenario: string, action: () => Promise<void>) {
  const findings: Finding[] = []
  const origin = new URL(info.project.use.baseURL || 'https://avgst.ru').origin
  let navigating = false
  let documentGeneration = 0
  const requestDocuments = new WeakMap<Request, number>()
  // An outgoing document can cancel requests before the next document request
  // is emitted. Mark navigation at the action, not only at its network event.
  navigationIntents.set(page, () => { navigating = true; documentGeneration++ })
  const cancelledImages = new Map<string, number[]>()
  const imageMessages: { finding: Finding; url: string; at: number }[] = []
  page.on('request', request => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      navigating = true
      documentGeneration++
    }
    requestDocuments.set(request, documentGeneration)
  })
  page.on('domcontentloaded', () => { navigating = false })
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame() && /^https?:/.test(frame.url()) && new URL(frame.url()).origin !== origin)
      add('origin-escape', `Scenario left ${origin}: ${safeUrl(frame.url())}`, '', origin)
  })
  const add = (category: string, message: string, stack = '', location = page.url()) => {
    const source = !/^https?:/.test(location) ? 'unknown'
      : new URL(location).origin === origin ? 'application' : 'third-party'
    const provider = captchaProviderSource(location)
    const severity = runtimeSeverity(category, reactHydration(message + stack), location, origin)
    const cleanMessage = scrub(message)
    const finding: Finding = {
      url: safeUrl(page.url()), scenario: scenarioKey(scenario), browser: info.project.name,
      device: info.project.name.includes('mobile') ? 'mobile' : 'desktop',
      category: reactHydration(message + stack) ? 'react-hydration' : category,
      message: cleanMessage, stack: scrub(stack), severity, source,
      component: provider ? 'Yandex SmartCaptcha runtime' : 'unconfirmed',
      evidenceUrl: safeUrl(location),
      cause: provider ? 'confirmed' : 'unconfirmed', fingerprint: fingerprint(category, cleanMessage),
    }
    findings.push(finding)
    return finding
  }
  // Analytics requests are answered locally: the audit does not create real visits, views or clicks.
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg|\/api\/(?:views|reactions|consent)(?:\?|$))/, route =>
    route.fulfill({ status: 204, body: '' }))
  await page.route('**/next/leads', route => route.abort('blockedbyclient'))
  if (process.env.DIAG_TARGET !== 'production') {
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/_next/image' && !expectedCMSImageOptimization(request.url(), origin)) add('runtime-image-optimizer', 'Unexpected runtime image optimization: ' + safeUrl(request.url()), '', origin)
    })
    await page.route('https://smartcaptcha.cloud.yandex.ru/**', async route => {
      if (!new URL(route.request().url()).pathname.endsWith('/captcha.js')) return route.fulfill({ status: 204, body: '' })
      const { captchaFixtureScript } = await import('./third-party-fixtures')
      return route.fulfill({ contentType: 'application/javascript', body: captchaFixtureScript })
    })
  }
  page.on('pageerror', error => {
    const frameUrl = error.stack?.match(/\bat\s+[^\n]*?\((https?:\/\/[^)]+)\)/)?.[1]
      || error.stack?.match(/\bat\s+(https?:\/\/[^\s)]+)/)?.[1]
      || error.message.match(/\(error: (https?:\/\/[^)]+)\)/)?.[1]
    const category = webkitNavigationFetch(error.message, error.stack || '', info.project.name, navigating, origin)
      ? 'navigation-fetch-cancelled' : 'exception'
    add(category, error.message, error.stack || '', frameUrl || page.url())
  })
  page.on('console', message => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    const location = message.location()
    const finding = add(message.type() === 'error' ? 'console-error' : 'console-warning', message.text(), '', location.url)
    if (message.text().includes('Image corrupt or truncated.')) imageMessages.push({ finding, url: location.url, at: Date.now() })
  })
  page.on('requestfailed', request => {
    if (/^(?:data|blob):/.test(request.url())) return
    const previousDocument = (requestDocuments.get(request) ?? documentGeneration) < documentGeneration
    const cancelled = navigationCancellation(request.failure()?.errorText || '', true)
    if (cancelled && request.resourceType() === 'image') {
        for (let part: Request | null = request; part; part = part.redirectedFrom()) {
          const times = cancelledImages.get(part.url()) || []
          times.push(Date.now())
          cancelledImages.set(part.url(), times)
        }
    }
    if (cancelled && (navigating || previousDocument)) return
    add(/\.(?:js|css)(?:\?|$)/.test(request.url()) ? 'script-failure' : 'network-failure',
      `${request.method()} ${safeUrl(request.url())}: ${request.failure()?.errorText || 'failed'}`, '', request.url())
  })
  page.on('response', response => {
    if (response.status() < 400) return
    const request = response.request()
    if (!['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(request.resourceType())) return
    add(response.status() >= 500 ? 'http-5xx' : 'http-4xx',
      `${response.status()} ${safeUrl(response.url())}`, '', response.url())
  })
  let actionError: unknown
  try { await action() } catch (error) {
    actionError = error
    add('scenario-failure', error instanceof Error ? error.message : String(error),
      error instanceof Error ? error.stack || '' : '')
  }
  await page.waitForTimeout(800)
  for (const item of imageMessages) {
    if ((cancelledImages.get(item.url) || []).some(at => cancelledImageConsole(info.project.name, item.finding.message, item.at - at))) {
      item.finding.category = 'image-request-cancelled'
      item.finding.severity = 'warning'
      item.finding.cause = 'confirmed'
      item.finding.component = 'browser image cancellation'
      item.finding.fingerprint = fingerprint(item.finding.category, item.finding.message)
    }
  }
  if (imageMessages.length) await info.attach('image-cancellation-correlation', {
    body: Buffer.from(JSON.stringify({
      messages: imageMessages.map(item => ({ url: safeUrl(item.url), at: item.at, severity: item.finding.severity })),
      cancellations: [...cancelledImages].map(([url, times]) => ({ url: safeUrl(url), times })),
    })), contentType: 'application/json',
  })
  await info.attach('browser-diagnostics', {
    body: Buffer.from(JSON.stringify(findings, null, 2)),
    contentType: 'application/json',
  })
  navigationIntents.delete(page)
  if (findings.some(item => item.severity === 'critical') || actionError) {
    const screenshot = info.outputPath('diagnostic-failure.png')
    try { await page.screenshot({ path: screenshot, fullPage: true, timeout: 10_000 }) }
    catch {
      try { await page.screenshot({ path: screenshot, fullPage: false, timeout: 5_000 }) }
      catch { /* Keep the original browser finding; Playwright also captures failure screenshots. */ }
    }
    if (existsSync(screenshot)) await info.attach('failure-screenshot', { path: screenshot, contentType: 'image/png' })
  }
  if (actionError) throw actionError
  const critical = findings.filter(item => item.severity === 'critical')
  if (critical.length) throw new Error(`Browser diagnostics: ${critical.map(item => item.category + ' ' + item.fingerprint).join('; ')}`)
}
