import { test, expect, type Page } from '@playwright/test'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../src/consent/types'

test.beforeEach(async ({ page, baseURL }) => {
  await page.context().addCookies([{
    name: CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: false, analytics: false, marketing: false })),
    url: baseURL!,
  }])
})

async function openSearch(page: Page, mobile: boolean) {
  await page.setViewportSize({ width: mobile ? 390 : 1366, height: 844 })
  await page.goto('/catalog', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
  if (mobile) await page.getByRole('button', { name: 'Поиск проектов', exact: true }).click()
  const input = page.locator('.catalog-search input')
  await expect(input).toBeVisible()
  return input
}

for (const mobile of [false, true]) {
  test(`${mobile ? 'mobile' : 'desktop'} search waits for a typing pause`, async ({ page }) => {
    const input = await openSearch(page, mobile)
    const queries: string[] = []
    page.on('request', request => {
      const url = new URL(request.url())
      if (url.pathname === '/catalog' && url.searchParams.has('q')) queries.push(url.searchParams.get('q')!)
    })
    await input.pressSequentially('мод', { delay: 500 })
    expect(queries).toEqual([])
    await expect(page).toHaveURL(/q=/)
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('мод')
    expect(queries).toEqual(['мод'])
    if (mobile) {
      await expect(page.locator('.catalog__barrow')).not.toHaveClass(/is-search-open/)
      await expect(page.locator('.catalog__search-toggle')).toHaveAttribute('aria-expanded', 'false')
    } else await expect(input).toBeVisible()
  })

  test(`${mobile ? 'mobile' : 'desktop'} late results cannot erase newer typing`, async ({ page }) => {
    const input = await openSearch(page, mobile)
    let release!: () => void
    let requested!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const started = new Promise<void>(resolve => { requested = resolve })
    await page.route('**/catalog?**', async route => {
      if (new URL(route.request().url()).searchParams.get('q') !== 'мо') return route.continue()
      const response = await route.fetch()
      requested()
      await gate
      await route.fulfill({ response })
    })
    await input.fill('мо')
    await started
    await input.fill('мод')
    release()
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('мо')
    await expect(input).toHaveValue('мод')
    await expect(input).toBeFocused()
    if (mobile) await expect(page.locator('.catalog__barrow')).toHaveClass(/is-search-open/)
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('мод')
    if (mobile) await expect(page.locator('.catalog__barrow')).not.toHaveClass(/is-search-open/)
    else await expect(input).toHaveValue('мод')
  })
}

test('composition is not searched until input is committed', async ({ page }) => {
  const input = await openSearch(page, true)
  await input.dispatchEvent('compositionstart')
  await input.fill('мод')
  await page.waitForTimeout(1100)
  expect(new URL(page.url()).searchParams.has('q')).toBe(false)
  await expect(input).toBeVisible()
  await input.dispatchEvent('compositionend')
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('мод')
  await expect(page.locator('.catalog__barrow')).not.toHaveClass(/is-search-open/)
})

test('mobile search can close without changing the query', async ({ page }) => {
  await openSearch(page, true)
  await page.getByRole('button', { name: 'Закрыть поиск' }).click()
  await expect(page.locator('.catalog__barrow')).not.toHaveClass(/is-search-open/)
  expect(new URL(page.url()).searchParams.has('q')).toBe(false)
})

