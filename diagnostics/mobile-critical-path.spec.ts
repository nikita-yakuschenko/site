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

test('session recorder initializes after hydration and once per document @critical', async ({ page }, info) => diagnose(page, info, 'session recorder initialization', async () => {
  await page.route('https://one2click.ru/t.js', route => route.fulfill({ contentType: 'application/javascript', body: `window.__recorderProbe={loads:(window.__recorderProbe?.loads||0)+1,hydrated:document.documentElement.dataset.appHydrated,site:document.currentScript.getAttribute('data-site')};` }))
  beginNavigation(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.evaluate(() => (window as unknown as { __recorderProbe?: { loads: number } }).__recorderProbe?.loads)).toBe(1)
  expect(await page.evaluate(() => (window as unknown as { __recorderProbe: { hydrated: string; site: string } }).__recorderProbe)).toMatchObject({ hydrated: 'true', site: 'o2cdb0f742c97' })
  const start = await page.evaluate(() => performance.timeOrigin)
  await page.locator('.card__media').first().click()
  await expect(page.locator('.project-hero h1')).toBeVisible()
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(start)
  expect(await page.evaluate(() => (window as unknown as { __recorderProbe: { loads: number } }).__recorderProbe.loads)).toBe(1)
}))
