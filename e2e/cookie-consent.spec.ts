import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg|\/api\/(?:views|reactions)(?:\?|$))/, route => route.fulfill({ status: 204, body: '' }))
})

test('site works immediately without a cookie prompt or fabricated acceptance', async ({ page }) => {
  let accepts = 0
  await page.route('**/api/consent', route => { accepts++; return route.fulfill({ status: 204, body: '' }) })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await expect(page.locator('.cookie-banner')).not.toHaveAttribute('role', 'dialog')
  await expect(page.locator('.cookie-settings')).toHaveCount(0)
  expect((await page.context().cookies()).some(cookie => cookie.name === 'avgst_cookie_consent')).toBe(false)
  expect(accepts).toBe(0)
})

test('cookie policy has no consent settings control', async ({ page }) => {
  await page.goto('/cookies', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Настройки cookie' })).toHaveCount(0)
  await expect(page.locator('.cookie-banner')).not.toHaveAttribute('role', 'dialog')
})

for (const button of ['Понятно', 'Закрыть уведомление о cookie']) {
  test(`dismissal with «${button}» survives reload and a new visit`, async ({ page, context }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: button, exact: true }).click()
    await expect(page.locator('.cookie-banner')).toHaveCount(0)
    expect((await context.cookies()).some(cookie => cookie.name === 'avgst_cookie_consent')).toBe(false)
    // localStorage хранит закрытие и после удаления/истечения cookie.
    await context.clearCookies()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    await expect(page.locator('.cookie-banner')).toHaveCount(0)
    const nextVisit = await context.newPage()
    await nextVisit.goto('/cookies', { waitUntil: 'domcontentloaded' })
    await expect(nextVisit.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    await expect(nextVisit.locator('.cookie-banner')).toHaveCount(0)
    await nextVisit.close()
  })
}

test('mobile timer dismissal persists after reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install()
  await page.clock.pauseAt(new Date())
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.cookie-banner')).toBeVisible()
  await page.clock.fastForward(6000)
  await expect(page.locator('.cookie-banner')).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await expect(page.locator('.cookie-banner')).toHaveCount(0)
})

test('cookie fallback retains dismissal when localStorage cannot save it', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable') }
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Понятно', exact: true }).click()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await expect(page.locator('.cookie-banner')).toHaveCount(0)
})
