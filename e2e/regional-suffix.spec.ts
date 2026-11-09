import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('avgst:cookie-notice-dismissed','1'))
  await page.route(/mc\.yandex|yandex\.ru|roistat|one2click|mail\.ru|\/api\/(?:views|reactions|consent)/, route => route.abort())
})
for (const [region, text] of [['nn','в Нижнем Новгороде и области'], ['msk','в Москве и Московской области'], [null,'']] as const) test(`regional suffix uses confirmed IP result: ${region}`, async ({page,context}) => {
  // A saved/UTM Moscow price region is deliberately not geographic evidence.
  await context.addCookies([{name:'avgst_region',value:'msk',url:'http://localhost:3000'}])
  await page.route(/\/api\/visitor-region/, route => route.fulfill({json:{region}}))
  await page.goto('/?utm_source=msk')
  const heading=page.locator('h1[data-cms-block="hero.heading"]'),suffix=heading.locator('[data-regional-suffix]')
  await expect(heading).toBeVisible()
  if(text) await expect(suffix).toHaveText(text.replace(/ /g,'\u00a0'),{useInnerText:true})
  else { await page.waitForTimeout(300); await expect(suffix).toHaveCount(0) }
})
test('delayed, broken or malformed lookup never flashes a fallback regional suffix',async({page})=>{
  let release: (()=>void)|undefined
  await page.route(/\/api\/visitor-region/,async route=>{
    await new Promise<void>(resolve=>{release=resolve})
    await route.fulfill({status:503,json:{error:'unavailable'}})
  })
  await page.goto('/')
  const heading=page.locator('h1[data-cms-block="hero.heading"]')
  await expect(heading).toBeVisible()
  await expect(heading.locator('[data-regional-suffix]')).toHaveCount(0)
  await expect.poll(()=>Boolean(release)).toBe(true)
  release!()
  await page.waitForTimeout(200)
  await expect(heading.locator('[data-regional-suffix]')).toHaveCount(0)
})
test('returning to the tab drops a suffix the current IP no longer confirms', async ({ page }) => {
  let region: 'nn' | null = 'nn'
  await page.route(/\/api\/visitor-region/, route => route.fulfill({ json: { region } }))
  await page.goto('/')
  const suffix = page.locator('[data-regional-suffix]')
  await expect(suffix).toHaveText('в Нижнем Новгороде и области'.replace(/ /g, '\u00a0'), { useInnerText: true })
  region = null
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(suffix).toHaveCount(0)
})

test('a region selected in the header overrides IP and survives a reload', async ({ page }) => {
  await page.route(/\/api\/visitor-region/, route => route.fulfill({ json: { region: 'nn' } }))
  await page.goto('/')
  const suffix = page.locator('[data-regional-suffix]')
  await expect(suffix).toHaveText('в Нижнем Новгороде и области')
  await page.locator('.site-region__trigger').filter({ visible: true }).first().click()
  await page.getByRole('option', { name: 'Московская область' }).click()
  await expect(suffix).toHaveText('в Москве и Московской области')
  await page.reload()
  await expect(suffix).toHaveText('в Москве и Московской области')
})
