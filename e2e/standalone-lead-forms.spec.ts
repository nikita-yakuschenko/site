import { test, expect, type Page } from '@playwright/test'
import { captchaFixtureScript } from '../diagnostics/third-party-fixtures'
import { leadInputSchema } from '../src/lib/leads'

async function prepare(page: Page, mode = 'success') {
  const submissions: Record<string, unknown>[] = []
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|\/api\/(?:views|reactions|consent)(?:\?|$))/, route => route.fulfill({ status: 204, body: '' }))
  await page.route('**/api/smartcaptcha-config', route => route.fulfill({ json: { siteKey: 'local-only' } }))
  await page.route('https://smartcaptcha.cloud.yandex.ru/**', route => route.fulfill({ contentType: 'application/javascript', body: captchaFixtureScript }))
  await page.addInitScript(value => { (window as unknown as Record<string, unknown>).__captchaMode = value }, mode)
  await page.route('**/next/leads', async route => {
    const body = route.request().postDataJSON()
    submissions.push(body)
    // Тот же контракт, что у сервера. До CMS/CRM тестовые заявки не доходят.
    const parsed = leadInputSchema.safeParse(body)
    await route.fulfill(parsed.success && parsed.data.captchaToken
      ? { json: { accepted: true, id: 'local-receipt' } }
      : { status: 400, json: { error: 'invalid-input' } })
  })
  return submissions
}

for (const modal of [false, true]) {
  test(`open day ${modal ? 'dialog' : 'inline'}: valid request includes captcha and confirms success`, async ({ page }) => {
    const submissions = await prepare(page)
    await page.goto('/factory-open-day', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
    if (modal) await page.locator('[aria-controls="ags-booking-dialog"]').first().click()
    const form = page.locator(modal ? 'dialog .ags-form' : '.ags-book__body .ags-form')
    await form.locator('[name="name"]').fill('Тест Регистрации')
    await form.locator('[name="phone"]').fill('9123456789')
    await form.locator('[name="email"]').fill('test@example.test')
    await form.locator('.ags-agree__tick').click()
    await form.getByRole('button', { name: 'Записаться', exact: true }).click()
    await expect.poll(() => submissions.length).toBe(1)
    expect(submissions[0]?.captchaToken).toBe('diagnostic-browser-fixture-token')
    expect(submissions[0]?.meta).toMatchObject({ email: 'test@example.test' })
    await expect(page.locator('.ags-form--success')).toBeVisible()
  })
}

test('open day does not submit on captcha failure and allows retry', async ({ page }) => {
  const submissions = await prepare(page, 'network-error')
  await page.goto('/factory-open-day', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  const form = page.locator('.ags-book__body .ags-form')
  await form.locator('[name="name"]').fill('Тест Регистрации')
  await form.locator('[name="phone"]').fill('9123456789')
  await form.locator('[name="email"]').fill('test@example.test')
  await form.locator('.ags-agree__tick').click()
  await form.getByRole('button', { name: 'Записаться', exact: true }).click()
  await expect(form.getByRole('alert')).toBeVisible()
  expect(submissions).toHaveLength(0)
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__captchaMode = 'success' })
  await form.getByRole('button', { name: 'Записаться', exact: true }).click()
  await expect(page.locator('.ags-form--success')).toBeVisible()
  expect(submissions).toHaveLength(1)
})

test('referral form sends captcha, string identifiers and registration email', async ({ page }) => {
  const submissions = await prepare(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await page.locator('.referral__open').click()
  const form = page.locator('.referral__form')
  await form.locator('[name="name"]').fill('Тест Участника')
  await form.locator('[name="phone"]').fill('9123456789')
  await form.locator('[name="email"]').fill('test@example.test')
  await form.locator('[type="submit"]').click()
  await expect.poll(() => submissions.length).toBe(1)
  expect(submissions[0]?.captchaToken).toBe('diagnostic-browser-fixture-token')
  expect(submissions[0]?.siteId).toBe('corporate')
  expect(submissions[0]?.meta).toEqual({ email: 'test@example.test' })
  await expect(page.locator('.referral__success')).toBeVisible()
})
