import { expect, test } from '@playwright/test'
import { beginNavigation, diagnose } from './probe'

test.skip(process.env.DIAG_TARGET === 'production', 'Deterministic asset budget for the fixture production build')

test('home excludes unrelated route CSS from the critical path @critical', async ({ page }, info) => diagnose(page, info, 'home critical CSS budget', async () => {
  beginNavigation(page)
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  const hrefs = await page.evaluate(() => [...document.styleSheets].map(sheet => sheet.href).filter((href): href is string => Boolean(href)))
  const sheets = await Promise.all(hrefs.map(async href => {
    const response = await page.request.get(href)
    expect(response.ok()).toBe(true)
    return { href, text: await response.text() }
  }))
  const css = sheets.map(sheet => sheet.text).join('\n')
  const bytes = Buffer.byteLength(css)
  for (const selector of ['.catalog__layout', '.mortgage-calc__quote-summary', '.manufacture-hero__scene', '.company-bento__hero', '.referral-rules__section']) {
    expect(css, `Unrelated selector ${selector} must not block the home page`).not.toContain(selector)
  }
  expect(bytes, 'Decoded initial CSS budget (previous build was over 200 kB)').toBeLessThanOrEqual(160_000)
  await info.attach('critical-css-budget', { body: JSON.stringify({ bytes, limit: 160_000, sheets: sheets.map(({ href, text }) => ({ path: new URL(href).pathname, bytes: Buffer.byteLength(text) })) }, null, 2), contentType: 'application/json' })
}))
