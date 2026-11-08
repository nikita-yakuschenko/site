import { test, expect } from '@playwright/test'
import { captchaFixtureScript } from '../diagnostics/third-party-fixtures'
import { leadInputSchema } from '../src/lib/leads'

for (const width of [359, 1440]) {
  test(`project viewers keep the passport through navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 359 ? 780 : 960 })
    const pdfRequests: string[] = []
    page.on('request', request => { if (request.url().includes('/api/passports/')) pdfRequests.push(request.url()) })
    await page.goto('/catalog/barnhouse-138', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    for (const selector of ['.project-bento button', '.project-plans__sheet', '.project-rows button']) {
      if (selector.includes('rows')) {
        await page.goto('/catalog/frame-60', { waitUntil: 'domcontentloaded' })
        await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
      }
      const opener = page.locator(selector).first()
      await expect(opener).toBeVisible()
      await opener.click()
      const viewer = page.locator('.photo-lightbox')
      const pill = viewer.locator('.passport-concept')
      await expect(pill).toHaveAttribute('data-ready', 'true')
      await expect(pill).toHaveAttribute('data-visible', 'true')
      const identity = await pill.locator('form').getAttribute('id')
      const next = viewer.locator('.photo-lightbox__nav--next')
      if (await next.count()) {
        await next.click()
        await expect(pill.locator('form')).toHaveAttribute('id', identity!)
        await expect(pill).toHaveAttribute('data-ready', 'true')
        await expect(pill).toHaveAttribute('data-visible', 'true')
      }
      await pill.getByRole('button', { name: 'Скачать паспорт проекта', exact: true }).click()
      await expect(pill.getByRole('button', { name: 'Скачать PDF', exact: true })).toBeDisabled()
      await pill.getByRole('textbox').fill('89990000000')
      await expect(pill.getByRole('button', { name: 'Скачать PDF', exact: true })).toBeEnabled()
      await page.keyboard.press('Escape')
      await expect(pill).toHaveAttribute('data-open', 'false')
      await expect(viewer).toBeVisible()
      await expect(pill.getByRole('button', { name: 'Скачать паспорт проекта', exact: true })).toBeVisible()
      await viewer.screenshot({ path: `.local/messenger-review/viewer-${width}-${selector.includes('plans') ? 'plans' : selector.includes('rows') ? 'interiors' : 'exteriors'}.png` })
      await viewer.locator('.photo-lightbox__close').click()
      await expect(viewer).toHaveCount(0)
      await opener.click()
      await expect(viewer.locator('.passport-concept')).toHaveAttribute('data-ready', 'true')
      await viewer.locator('.photo-lightbox__close').click()
    }
    expect(pdfRequests).toHaveLength(0)
  })

  test(`messengers accept phone only and preserve callback at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 359 ? 780 : 960 })
    const submissions: Record<string, unknown>[] = []
    await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru)/, route => route.fulfill({ status: 204, body: '' }))
    await page.route('**/api/smartcaptcha-config', route => route.fulfill({ json: { siteKey: 'local-only' } }))
    await page.route('https://smartcaptcha.cloud.yandex.ru/**', route => route.fulfill({ contentType: 'application/javascript', body: captchaFixtureScript }))
    await page.route('**/next/leads', async route => {
      const payload = route.request().postDataJSON()
      const parsed = leadInputSchema.safeParse(payload)
      expect(parsed.success).toBe(true)
      expect(payload.captchaToken).toBe('diagnostic-browser-fixture-token')
      submissions.push(payload)
      await route.fulfill({ json: { accepted: true, id: crypto.randomUUID() } })
    })
    await page.goto('/catalog/barnhouse-138', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    for (const [index, channel] of ['MAX', 'Telegram', 'WhatsApp'].entries()) {
      await page.getByRole('button', { name: channel, exact: true }).click()
      const dialog = page.locator('.ask-dialog')
      await expect(dialog.locator('input[name="name"]')).toHaveCount(0)
      await expect(dialog.locator('textarea')).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Отправить', exact: true }).click()
      await expect(dialog.locator('input[name="phone"]')).toHaveAttribute('aria-invalid', 'true')
      expect(submissions).toHaveLength(index)
      await dialog.locator('input[name="phone"]').fill('89990000000')
      await dialog.getByRole('button', { name: 'Отправить', exact: true }).click()
      await expect.poll(() => submissions.length).toBe(index + 1)
      expect(submissions[index]?.name).toBe(`Свяжемся с вами в ${channel}`)
      expect(submissions[index]?.phone).toBe('+79990000000')
      await expect(dialog.getByText('Спасибо! Заявка принята', { exact: true })).toBeVisible()
      await dialog.locator('.ask-dialog__close').click()
    }
    await page.getByRole('button', { name: 'Перезвоните мне', exact: true }).click()
    await expect(page.locator('.ask-dialog input[name="name"]')).toHaveCount(0)
    await expect(page.locator('.messenger-form')).toHaveCount(0)
    await page.locator('.ask-dialog input[name="phone"]').fill('89990000000')
    await page.getByRole('button', { name: 'Жду звонка', exact: true }).click()
    await expect.poll(() => submissions.length).toBe(4)
    expect(submissions[3]?.name).toBe('Перезвоните мне')
    await page.locator('.ask-dialog__close').click()
  })
}
