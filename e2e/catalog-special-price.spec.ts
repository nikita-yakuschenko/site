import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('avgst:cookie-notice-dismissed', '1'))
  await page.route(/yandex|roistat|one2click|mail\.ru|\/next\/leads|\/api\/(?:views|reactions|consent)/, route => route.abort())
})

test('changing city updates active price filtering without reshuffling the session', async ({ page }) => {
  await page.goto('/catalog?price=-1800000')
  const matched = page.locator('.catalog__results .grid-2').first()
  const project = 'a.card__title-link[href="/catalog/barnhouse-76"]'
  await expect(matched.locator(project)).toBeVisible()
  await page.locator('.site-region__trigger').click()
  await page.getByRole('option', { name: 'Московская область', exact: true }).click()
  await expect(matched.locator(project)).toHaveCount(0)
  await page.locator('.site-region__trigger').click()
  await page.getByRole('option', { name: 'Нижний Новгород', exact: true }).click()
  await expect(matched.locator(project)).toBeVisible()
})

for (const width of [1440, 390]) for (const region of ['nn', 'msk'] as const) test(`catalog and configuration show the same special price ${region} at ${width}`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 1000 })
  await context.addCookies([{ name: 'avgst_region', value: region, url: 'http://localhost:3000' }])
  await page.goto('/catalog')
  const card = page.locator('article.card').filter({ has: page.locator('a.card__title-link[href="/catalog/barnhouse-76"]') })
  const price = region === 'nn' ? 1700000 : 2100000
  const compact = (text: string) => text.replace(/\s/g, '')
  await expect(card.locator('.price')).toHaveText(new RegExp(price.toLocaleString('ru-RU').replace(/\s/g, '\\s*')))
  const label = compact(await card.locator('.price').innerText())
  await card.locator('a.card__title-link').click()
  const standard = page.locator('.project-config__tier').nth(1).locator('.project-config__tier-price')
  await expect(standard).toContainText('Специальная цена')
  expect(label).toBe(`от${compact(await standard.innerText()).replace('Специальнаяцена', '')}`)
  await page.goto(`/catalog?price=-${price}`)
  await expect(page.locator('.catalog__results .grid-2').first().locator('a.card__title-link[href="/catalog/barnhouse-76"]')).toBeVisible()
})

