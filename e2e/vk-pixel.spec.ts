import { test, expect } from '@playwright/test'

test('VK загружается без согласия и работает при выборе только необходимых cookie', async ({ page }) => {
  let loads = 0
  await page.route('https://top-fwz1.mail.ru/js/code.js', async route => {
    loads += 1
    await route.fulfill({ contentType: 'application/javascript', body: '' })
  })
  await page.goto('/')
  await expect(page.locator('.cookie-banner')).toBeVisible()
  await expect.poll(() => loads).toBe(1)
  await expect.poll(() => page.evaluate(() => (window._tmr as unknown as { type: string }[]).filter(event => event.type === 'pageView').length)).toBe(1)
  await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
  await expect(page.locator('.cookie-banner')).toHaveCount(0)
  await page.locator('a[href="/cookies"]').first().click()
  await expect(page).toHaveURL(/\/cookies$/, { timeout: 30_000 })
  await expect.poll(() => page.evaluate(() => (window._tmr as unknown as { type: string }[]).filter(event => event.type === 'pageView').length)).toBe(2)
  expect(loads).toBe(1)
  await page.getByRole('button', { name: 'Настройки cookie', exact: true }).click()
  await page.getByRole('button', { name: 'Только необходимые', exact: true }).click()
  await page.reload()
  await expect(page.locator('.cookie-banner')).toHaveCount(0)
  await expect.poll(() => loads).toBe(2)
  await expect(page.locator('#tmr-code')).toHaveCount(1)
})
