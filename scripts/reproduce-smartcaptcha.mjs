import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

// Isolate the real provider without Next.js, React or a lead submission.
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const errors = []
  const safeUrl = raw => { try { const url = new URL(raw); return url.origin + url.pathname } catch { return '' } }
  page.on('console', message => {
    if (message.type() === 'error') errors.push({ type: 'console', message: message.text(), sourceUrl: safeUrl(message.location().url) })
  })
  page.on('requestfailed', request => errors.push({ type: 'requestfailed', sourceUrl: safeUrl(request.url()), message: request.failure()?.errorText }))
  page.on('pageerror', error => errors.push({ type: 'pageerror', message: error.message, stack: error.stack, sourceUrl: safeUrl(error.stack?.match(/\n\s+at[^\n]*?(https?:\/\/[^\s)]+)/)?.[1] || '') }))
  await page.route('https://avgst.ru/__captcha-diagnostic', route => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body><div id="captcha"></div></body></html>',
  }))
  await page.goto('https://avgst.ru/__captcha-diagnostic', { waitUntil: 'domcontentloaded' })
  const response = await page.request.get('https://avgst.ru/api/smartcaptcha-config')
  if (!response.ok()) throw new Error(`Captcha configuration returned ${response.status()}`)
  const { siteKey } = await response.json()
  if (!siteKey) throw new Error('Captcha client key is unavailable')
  await page.addScriptTag({ url: 'https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload' })
  await page.waitForFunction(() => typeof window.smartCaptcha?.render === 'function')
  await page.evaluate(key => window.smartCaptcha.render('captcha', {
    sitekey: key, invisible: true, hideShield: true, hl: 'ru',
  }), siteKey)
  await page.waitForTimeout(10_000)
  const frames = page.frames().map(frame => safeUrl(frame.url())).filter(Boolean)
  const result = { generatedAt: new Date().toISOString(), applicationCode: false, widgetCount: 1, executed: false, frames, errors }
  await mkdir('diagnostics-results', { recursive: true })
  await writeFile('diagnostics-results/smartcaptcha-isolation.json', JSON.stringify(result, null, 2))
  console.log(`Isolated SmartCaptcha: ${errors.length} browser errors; no application code or lead submission`)
} finally {
  await browser.close()
}
