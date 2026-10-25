import { expect, test, type Page } from '@playwright/test'
import { captchaFixtureScript } from './third-party-fixtures'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../src/consent/types'

test.skip(process.env.DIAG_TARGET === 'production', 'Controlled SDK and receipt double: local only')

async function prepare(page: Page, mode = 'success') {
  await page.context().addCookies([{ name: CONSENT_COOKIE, url: String(test.info().project.use.baseURL), value: encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: false, analytics: false, marketing: false })) }])
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|vk\.com\/rtrg|\/api\/(?:views|reactions|consent)(?:\?|$))/, route => route.fulfill({ status: 204, body: '' }))
  let sdk = 0
  const submissions: Record<string, unknown>[] = []
  await page.route('**/api/smartcaptcha-config', route => route.fulfill({ json: { siteKey: 'local-only', configured: true } }))
  await page.route('https://smartcaptcha.cloud.yandex.ru/**', route => {
    sdk++
    return route.fulfill({ contentType: 'application/javascript', body: captchaFixtureScript })
  })
  await page.route('**/next/leads', route => {
    submissions.push(route.request().postDataJSON())
    return route.fulfill({ json: { accepted: true, id: 'local-receipt' } })
  })
  await page.addInitScript(value => { (window as unknown as Record<string, unknown>).__captchaMode = value }, mode)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  // Static contact form avoids viewport-specific menu controls.
  const form = page.locator('form[data-cms-block="LeadForm"]').filter({ has: page.locator('textarea') }).last()
  await expect(form).toBeVisible()
  const fill = async () => {
    await form.locator('input[name=name]').fill('Тест Проверки')
    await form.locator('input[name=phone]').fill('9123456789')
    await form.locator('input[name=consent]').check()
  }
  return { form, fill, submissions, sdk: () => sdk }
}

test('captcha lazy, single execution, hidden/success race and one server receipt', async ({ page }) => {
  const run = await prepare(page)
  expect(run.sdk()).toBe(0)
  await run.form.locator('button[type=submit]').click()
  expect(run.sdk()).toBe(0)
  await run.fill()
  expect(run.sdk()).toBe(0)
  await run.form.evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  await expect.poll(() => run.submissions.length).toBe(1)
  expect(run.submissions[0]?.captchaToken).toBe('diagnostic-browser-fixture-token')
  await expect(page.locator('.smart-captcha')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __captchaStats: unknown }).__captchaStats)).toEqual({ renders: 1, executes: 1, destroys: 1 })
  await expect(run.form.locator('.form-success-animation, .lead-submit-feedback').first()).toBeVisible()
})

for (const mode of ['network-error', 'javascript-error', 'challenge-hidden', 'token-expired']) {
  test(`captcha ${mode} fails closed and supports explicit retry`, async ({ page }) => {
    const run = await prepare(page, mode)
    await run.fill()
    await run.form.locator('button[type=submit]').click()
    await expect(run.form.getByRole('alert')).toBeVisible()
    expect(run.submissions).toHaveLength(0)
    await expect(page.locator('.smart-captcha')).toHaveCount(0)
    await page.evaluate(() => { (window as unknown as Record<string, unknown>).__captchaMode = 'success' })
    await run.form.locator('button[type=submit]').click()
    await expect.poll(() => run.submissions.length).toBe(1)
    expect(run.sdk()).toBe(1)
  })
}

test('missing sitekey never loads SDK or sends lead', async ({ page }) => {
  const run = await prepare(page)
  await page.route('**/api/smartcaptcha-config', route => route.fulfill({ json: { siteKey: null, configured: false } }))
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(run.form.getByRole('alert')).toBeVisible()
  expect(run.sdk()).toBe(0)
  expect(run.submissions).toHaveLength(0)
})

test('navigation cancels pending captcha, return does not accumulate widgets', async ({ page }) => {
  const run = await prepare(page, 'pending')
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  await expect(page.locator('.smart-captcha')).toHaveCount(0)
  expect(run.submissions).toHaveLength(0)
})

test('SDK download failure terminates verification without a lead', async ({ page }) => {
  const run = await prepare(page)
  await page.route('https://smartcaptcha.cloud.yandex.ru/**', route => route.abort('failed'))
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(run.form.getByRole('alert')).toBeVisible()
  await expect(run.form.getByRole('button', { name: 'Обновить страницу' })).toBeVisible()
  await expect(run.form.locator('button[type=submit]')).toBeDisabled()
  expect(run.submissions).toHaveLength(0)
  await expect(page.locator('.smart-captcha')).toHaveCount(0)
})

test('timeout cleans pending widget and permits another attempt', async ({ page }) => {
  await page.clock.install()
  const run = await prepare(page, 'pending')
  await run.fill()
  // Exercise the timeout, independently of mobile focus/keyboard tap handling.
  // Other scenarios cover actual submit-button clicks in the same profiles.
  await run.form.evaluate(form => (form as HTMLFormElement).requestSubmit())
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __captchaStats?: { executes: number } }).__captchaStats?.executes)).toBe(1)
  await page.clock.fastForward(120_001)
  await expect(run.form.getByRole('alert')).toBeVisible()
  expect(run.submissions).toHaveLength(0)
  await expect(page.locator('.smart-captcha')).toHaveCount(0)
  await page.evaluate(() => { (window as unknown as Record<string, unknown>).__captchaMode = 'success' })
  await run.form.locator('button[type=submit]').click()
  await expect.poll(() => run.submissions.length).toBe(1)
})

test('a rejected server receipt never shows success; fresh token keeps requestId', async ({ page }) => {
  const run = await prepare(page)
  const requests: Record<string, unknown>[] = []
  await page.route('**/next/leads', route => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({ status: requests.length === 1 ? 403 : 202, json: requests.length === 1 ? { error: 'captcha-failed' } : { accepted: true, id: 'retry-receipt' } })
  })
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(run.form.getByRole('alert')).toBeVisible()
  await expect(run.form.locator('.form-success-animation')).toHaveCount(0)
  await run.form.locator('button[type=submit]').click()
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[0]?.requestId).toBe(requests[1]?.requestId)
})

test('closing dialog cancels captcha and reopening starts cleanly', async ({ page }, info) => {
  const run = await prepare(page, 'pending')
  const open = async () => {
    if (info.project.name.includes('mobile')) {
      if (await page.locator('.site-header__burger').getAttribute('aria-expanded') !== 'true') await page.locator('.site-header__burger').click()
      await page.locator('.site-menu__ask').click()
    } else await page.locator('.site-header__cta').click()
  }
  await open()
  const dialog = page.getByRole('dialog', { name: 'Задать вопрос' })
  const form = dialog.locator('form')
  await form.locator('input[name=name]').fill('Тест Проверки')
  await form.locator('input[name=phone]').fill('9123456789')
  await form.locator('button[type=submit]').click()
  await expect(dialog.locator('.smart-captcha')).toHaveCount(1)
  await dialog.getByRole('button', { name: /Закрыть/ }).first().click()
  await expect(page.locator('.smart-captcha')).toHaveCount(0)
  await open()
  await expect(dialog.locator('.smart-captcha')).toHaveCount(0)
  expect(run.submissions).toHaveLength(0)
})

test('concurrent forms share SDK and destroy only their own widget', async ({ page }, info) => {
  const run = await prepare(page, 'pending')
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  if (info.project.name.includes('mobile')) {
    await page.locator('.site-header__burger').click()
    await page.locator('.site-menu__ask').click()
  } else await page.locator('.site-header__cta').click()
  const dialog = page.getByRole('dialog', { name: 'Задать вопрос' })
  await dialog.locator('input[name=name]').fill('Тест Проверки')
  await dialog.locator('input[name=phone]').fill('9123456789')
  await dialog.locator('button[type=submit]').click()
  await expect(page.locator('.smart-captcha')).toHaveCount(2)
  expect(run.sdk()).toBe(1)
  await dialog.getByRole('button', { name: /Закрыть/ }).first().click()
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  expect(run.submissions).toHaveLength(0)
})

test('late success from failed attempt cannot settle a new verification', async ({ page }) => {
  const run = await prepare(page, 'pending')
  await run.fill()
  await run.form.locator('button[type=submit]').click()
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __captchaStats?: { executes: number } }).__captchaStats?.executes)).toBe(1)
  await page.evaluate(() => (window as unknown as { __captchaEmit: (event: string) => void }).__captchaEmit('network-error'))
  await expect(run.form.getByRole('alert')).toBeVisible()
  await run.form.locator('button[type=submit]').click()
  await expect(page.locator('.smart-captcha')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => (window as unknown as { __captchaStats?: { executes: number } }).__captchaStats?.executes)).toBe(2)
  await page.evaluate(() => {
    const captured = (window as unknown as { __captchaCaptured: ((token: string) => void)[][] }).__captchaCaptured
    captured[0]?.forEach(callback => callback('obsolete-token'))
  })
  expect(run.submissions).toHaveLength(0)
  await expect(run.form).toHaveAttribute('aria-busy', 'true')
  await page.evaluate(() => (window as unknown as { __captchaEmit: (event: string) => void }).__captchaEmit('success'))
  await expect.poll(() => run.submissions.length).toBe(1)
  expect(run.submissions[0]?.captchaToken).toBe('diagnostic-browser-fixture-token')
})
