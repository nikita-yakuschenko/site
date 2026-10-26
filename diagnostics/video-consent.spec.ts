import { expect, test } from '@playwright/test'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../src/consent/types'

test.beforeEach(async ({ page }) => {
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg|\/api\/(?:views|reactions|consent)(?:\?|$))/, route => route.fulfill({ status: 204, body: '' }))
})

for (const legacyChoice of [false, true]) {
  test(`video opens directly without cookie prompt (legacy choice: ${legacyChoice})`, async ({ page }, info) => {
    let videoRequests = 0
    let consentWrites = 0
    await page.route('**/api/consent', route => { consentWrites++; return route.fulfill({ status: 204, body: '' }) })
    if (legacyChoice) await page.context().addCookies([{ name: CONSENT_COOKIE, url: String(info.project.use.baseURL), value: encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: false, analytics: false, marketing: false })) }])
    await page.route('https://kinescope.io/**', route => {
      videoRequests++
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local player fixture</title>' })
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    expect(videoRequests).toBe(0)
    await page.locator('button.factory-video').click()
    const dialog = page.getByRole('dialog', { name: 'Завод «Авангард Строй»' })
    await expect(dialog.locator('iframe')).toHaveCount(1)
    await expect(dialog.locator('.consent-embed-placeholder')).toHaveCount(0)
    await expect.poll(() => videoRequests).toBe(1)
    const consent = (await page.context().cookies()).find(cookie => cookie.name === CONSENT_COOKIE)
    expect(Boolean(consent)).toBe(legacyChoice)
    if (consent) expect(JSON.parse(decodeURIComponent(consent.value)).functional).toBe(false)
    expect(consentWrites).toBe(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
}

test('analytics fallback remains invisible if a recorder replaces noscript with text', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-analytics-fallback]').evaluateAll(elements => elements.forEach(element => {
    element.querySelector('noscript')?.replaceWith(document.createTextNode('SCRIPT_PLACEHOLDER fallback pixel markup'))
  }))
  await expect(page.locator('body')).not.toContainText('SCRIPT_PLACEHOLDER', { useInnerText: true })
  await expect(page.locator('h1').first()).toBeVisible()
})

test('noscript pixels still request images with JavaScript disabled', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: String(info.project.use.baseURL) })
  try {
    const page = await context.newPage()
    const pixels: string[] = []
    await page.route(/(?:mc\.yandex\.ru\/watch\/|top-fwz1\.mail\.ru\/counter)/, route => {
      pixels.push(route.request().url())
      return route.fulfill({ status: 204, body: '' })
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => pixels.length).toBe(2)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('mc.yandex.ru/watch', { useInnerText: true })
  } finally { await context.close() }
})

test('page content stays visible if application scripts fail to load', async ({ page }) => {
  await page.route('**/_next/**/*.js', route => route.abort('failed'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText('SCRIPT_PLACEHOLDER', { useInnerText: true })
})

 test('cookie notice is informational, dismisses without acceptance and auto-hides after six seconds only on mobile', async ({ page }, info) => {
  let writes = 0
  await page.route('**/api/consent', route => { writes++; return route.fulfill({ status: 204, body: '' }) })
  await page.clock.install()
  await page.clock.pauseAt(new Date())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  const notice = page.getByRole('region', { name: 'Использование cookie' })
  await expect(notice).toBeVisible()
  await expect(page.locator('script[src*="metrika/tag.js"]')).toHaveCount(1)
  await page.clock.fastForward(5999)
  await expect(notice).toBeVisible()
  await page.clock.fastForward(1)
  if (info.project.name.includes('mobile')) await expect(notice).toHaveCount(0)
  else {
    await expect(notice).toBeVisible()
    await notice.getByRole('button', { name: 'Понятно' }).click()
    await expect(notice).toHaveCount(0)
  }
  expect(writes).toBe(0)
  await expect(page.locator('script[src*="metrika/tag.js"]')).toHaveCount(1)
  expect((await page.context().cookies()).some(cookie => cookie.name === CONSENT_COOKIE)).toBe(false)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await expect(notice).toHaveCount(0)
 })
