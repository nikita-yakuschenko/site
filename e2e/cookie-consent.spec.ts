import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg|\/api\/(?:views|reactions)(?:\?|$))/, route => route.fulfill({ status: 204, body: '' }))
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
