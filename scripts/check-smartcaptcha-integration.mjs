import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

// Serve the local production build on the allowed origin inside this browser
// only. The real provider runs unchanged; lead traffic is always intercepted.
const local = process.env.SMARTCAPTCHA_LOCAL_URL || 'http://127.0.0.1:3000'
const production = process.argv.includes('--production')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  let sdkRequests = 0
  let blockedLeads = 0
  const errors = []
  page.on('pageerror', error => errors.push({ message: error.message, stack: error.stack }))
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'smartcaptcha.cloud.yandex.ru' && new URL(request.url()).pathname === '/captcha.js') sdkRequests++
  })
  await page.route('https://avgst.ru/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/next/leads') { blockedLeads++; return route.abort('blockedbyclient') }
    if (/^\/api\/(views|reactions|consent)$/.test(url.pathname)) return route.fulfill({ status: 204, body: '' })
    if (url.pathname === '/api/smartcaptcha-config') return route.continue()
    if (production) return route.continue()
    const response = await page.request.get(local + url.pathname + url.search)
    return route.fulfill({ response })
  })
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg)/, route => route.fulfill({ status: 204, body: '' }))
  await page.goto('https://avgst.ru/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.appHydrated === 'true')
  const form = page.locator('form[data-cms-block="LeadForm"]').filter({ has: page.locator('textarea') }).last()
  const snapshot = async () => ({ sdkRequests, widgets: await page.locator('.smart-captcha').count(), providerFrames: page.frames().filter(frame => frame.url().startsWith('https://smartcaptcha.cloud.yandex.ru/')).length })
  await page.waitForTimeout(1000)
  const idle = await snapshot()
  await form.locator('button[type=submit]').click()
  const invalid = await snapshot()
  await form.locator('input[name=name]').fill('Тест Проверки')
  await form.locator('input[name=phone]').fill('9123456789')
  await form.locator('button[type=submit]').click()
  await page.waitForTimeout(10_000)
  const submitted = await snapshot()
  const result = { generatedAt: new Date().toISOString(), localApplication: !production, officialSDK: true, idle, invalid, submitted, blockedLeads, errors }
  await mkdir('diagnostics-results', { recursive: true })
  await writeFile(`diagnostics-results/smartcaptcha-${production ? 'production-baseline' : 'real-integration'}.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ idle, invalid, submitted, blockedLeads, errors: errors.length }))
  if (!production && (idle.sdkRequests || invalid.sdkRequests || submitted.sdkRequests !== 1)) throw new Error('Unexpected SDK lifecycle')
} finally { await browser.close() }
