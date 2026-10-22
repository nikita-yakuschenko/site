import type { Page, TestInfo } from '@playwright/test'

export type Finding = {
  url: string
  scenario: string
  browser: string
  device: string
  category: string
  message: string
  stack: string
  severity: 'critical' | 'warning' | 'info'
  source: 'application' | 'third-party'
  component: string
  cause: 'confirmed' | 'unconfirmed'
  fingerprint: string
}

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
  return /(?:React error #(?:418|419)|react\.dev\/errors\/(?:418|419)|hydration|hydrating|server rendered HTML|didn't match the client)/i.test(text)
}

export async function diagnose(page: Page, info: TestInfo, scenario: string, action: () => Promise<void>) {
  const findings: Finding[] = []
  const origin = new URL(info.project.use.baseURL || 'https://avgst.ru').origin
  const add = (category: string, message: string, stack = '', location = page.url()) => {
    const source = location.startsWith(origin) || !/^https?:/.test(location) ? 'application' : 'third-party'
    const severity = reactHydration(message + stack) || (source === 'application' && ['exception', 'console-error', 'script-failure', 'http-5xx'].includes(category))
      ? 'critical' : category === 'console-warning' || source === 'third-party' ? 'warning' : 'info'
    const cleanMessage = scrub(message)
    findings.push({
      url: safeUrl(page.url()), scenario, browser: info.project.name.split('-')[0]!,
      device: info.project.name.includes('mobile') ? 'mobile' : 'desktop',
      category: reactHydration(message + stack) ? 'react-hydration' : category,
      message: cleanMessage, stack: scrub(stack), severity, source,
      component: location.includes('smartcaptcha.cloud.yandex.ru') ? 'Yandex SmartCaptcha iframe' : 'unconfirmed',
      cause: 'unconfirmed', fingerprint: fingerprint(category, cleanMessage),
    })
  }
  // Analytics requests are answered locally: the audit does not create real visits, views or clicks.
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|\/api\/(?:views|reactions)(?:\?|$))/, route =>
    route.fulfill({ status: 204, body: '' }))
  page.on('pageerror', error => {
    const frameUrl = error.stack?.match(/\bat\s+[^\n]*?\((https?:\/\/[^)]+)\)/)?.[1]
      || error.stack?.match(/\bat\s+(https?:\/\/[^\s)]+)/)?.[1]
    add('exception', error.message, error.stack || '', frameUrl || page.url())
  })
  page.on('console', message => {
    if (message.type() !== 'error' && message.type() !== 'warning') return
    const location = message.location()
    add(message.type() === 'error' ? 'console-error' : 'console-warning', message.text(), '', location.url)
  })
  page.on('requestfailed', request => {
    if (/^(?:data|blob):/.test(request.url())) return
    if (/^(?:net::ERR_ABORTED|NS_BINDING_ABORTED)$/.test(request.failure()?.errorText || '')) return
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
  await info.attach('browser-diagnostics', {
    body: Buffer.from(JSON.stringify(findings, null, 2)),
    contentType: 'application/json',
  })
  if (findings.some(item => item.severity === 'critical') || actionError) {
    const screenshot = info.outputPath('diagnostic-failure.png')
    try { await page.screenshot({ path: screenshot, fullPage: true, timeout: 10_000 }) }
    catch { await page.screenshot({ path: screenshot, fullPage: false, timeout: 10_000 }) }
    await info.attach('failure-screenshot', { path: screenshot, contentType: 'image/png' })
  }
  if (actionError) throw actionError
  const critical = findings.filter(item => item.severity === 'critical')
  if (critical.length) throw new Error(`Browser diagnostics: ${critical.map(item => item.category + ' ' + item.fingerprint).join('; ')}`)
}
