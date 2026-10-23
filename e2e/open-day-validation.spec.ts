import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  for (const theme of ['light', 'dark']) {
    for (const modal of [false, true]) {
      test(`${viewport.width}px ${theme} ${modal ? 'dialog' : 'inline'}: errors only after submission`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.addInitScript(value => localStorage.setItem('ags-theme', value), theme)
        await page.goto('/factory-open-day', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('html')).toHaveAttribute('data-ags-theme', theme)
        if (modal) await expect(async () => {
          await page.locator('[aria-controls="ags-booking-dialog"]').first().click()
          await expect(page.locator('dialog[open]')).toBeVisible({ timeout: 1000 })
        }).toPass({ timeout: 15000 })
        const form = page.locator(modal ? 'dialog .ags-form' : '.ags-book__body .ags-form')
        const inputs = form.locator('.ags-field__input')
        await expect(inputs).toHaveCount(3)
        for (const input of await inputs.all()) {
          await expect(input).toHaveAttribute('aria-invalid', 'false')
          await expect(input).toHaveCSS('outline-style', 'none')
          await expect(input).toHaveCSS('box-shadow', 'none')
        }
        const phone = form.locator('[name="phone"]')
        await expect(phone).toHaveValue('')
        await expect(phone).toHaveAttribute('placeholder', '+7 (900) 000-00-00')
        // Even native email invalidity must not produce an error before submit.
        await form.locator('[name="email"]').fill('unfinished')
        await phone.focus()
        await expect(form.locator('[name="email"]')).toHaveAttribute('aria-invalid', 'false')
        await expect(form.locator('[name="email"]')).toHaveCSS('box-shadow', 'none')
        await form.getByRole('button', { name: 'Записаться', exact: true }).click()
        await expect(form.locator('[aria-invalid="true"]')).toHaveCount(4)
        await form.locator('[name="name"]').fill('Иван')
        await phone.pressSequentially('+79001234567')
        await expect(phone).toHaveValue('+7 900 123-45-67')
        await form.locator('[name="email"]').fill('ivan@example.ru')
        await form.locator('.ags-agree__tick').click()
        await expect(form.locator('[aria-invalid="true"]')).toHaveCount(0)
      })
    }
  }
}
