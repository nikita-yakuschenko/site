import { test, expect } from '@playwright/test'
import { CATALOG_SESSION_COOKIE } from '../src/lib/catalog/session'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('avgst:cookie-notice-dismissed', '1'))
  await page.route(/yandex|roistat|one2click|mail\.ru|\/api\/(?:views|reactions|consent)/, route => route.abort())
})

for (const width of [1440, 390]) test(`catalog order persists through project navigation, reload and filters at ${width}`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/catalog')
  const cards = page.locator('.catalog__results .grid-2 .card__title-link')
  await cards.first().waitFor()
  const original = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
  expect(original.length).toBeGreaterThan(10)
  const session = (await context.cookies()).find(cookie => cookie.name === CATALOG_SESSION_COOKIE)
  expect(session?.expires).toBe(-1)
  expect(session?.httpOnly).toBe(true)
  await cards.first().click()
  await expect(page).toHaveURL(/\/catalog\/[^/?]+$/)
  await page.locator('a[href="/catalog"]:visible').first().click()
  await expect(cards.first()).toBeVisible()
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(original)
  await page.reload()
  await cards.first().waitFor()
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(original)
  await page.goto('/catalog?tech=panel')
  await cards.first().waitFor()
  await page.goto('/catalog?sort=area-asc')
  await cards.first().waitFor()
  const sorted = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
  expect(sorted).not.toEqual(original)
  await page.goto('/catalog')
  await cards.first().waitFor()
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(original)
  expect((await context.cookies()).find(cookie => cookie.name === CATALOG_SESSION_COOKIE)?.value).toBe(session?.value)
})

test('a new browser session receives a new seed and a different order', async ({ page, browser, context }) => {
  await page.goto('/catalog')
  const links = '.catalog__results .grid-2 .card__title-link'
  await page.locator(links).first().waitFor()
  const original = await page.locator(links).evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
  const another = await browser.newContext()
  try {
    const otherPage = await another.newPage()
    await otherPage.route(/yandex|roistat|one2click|mail\.ru|\/api\/(?:views|reactions|consent)/, route => route.abort())
    await otherPage.goto('/catalog')
    await otherPage.locator(links).first().waitFor()
    const next = await otherPage.locator(links).evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))
    expect((await another.cookies()).find(cookie => cookie.name === CATALOG_SESSION_COOKIE)?.value).not.toBe((await context.cookies()).find(cookie => cookie.name === CATALOG_SESSION_COOKIE)?.value)
    expect(next).not.toEqual(original)
  } finally { await another.close() }
})

