import { test, expect, type APIRequestContext } from '@playwright/test'
let api: APIRequestContext, block: { id: number; configurationTemplates: Record<string, unknown> }
const projects: { id: number; slug: string; badge: string }[] = []
const cms = process.env.FRAME_CMS_TEST_URL || 'http://localhost:3001'
const enabled = Boolean(process.env.CMS_UI_TEST_EMAIL && process.env.CMS_UI_TEST_PASSWORD)
test.skip(!enabled, 'Only explicitly configured local CMS test credentials')
test.beforeAll(async ({ playwright, baseURL }) => {
  expect(['localhost', '127.0.0.1']).toContain(new URL(cms).hostname)
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname)
  api = await playwright.request.newContext({ baseURL: cms, extraHTTPHeaders: { Origin: cms } })
  expect((await api.post('/api/users/login', { data: { email: process.env.CMS_UI_TEST_EMAIL, password: process.env.CMS_UI_TEST_PASSWORD } })).ok()).toBeTruthy()
  block = (await (await api.get('/api/blocks?where[key][equals]=ProjectConfig&limit=1&depth=0')).json()).docs[0]
  for (const [technology, badge] of [['frame', 'Каркасный'], ['panel', 'Панельно-каркасный'], ['modular', 'Модульный']] as const) {
    const slug = `frame-content-test-${technology}-${Date.now()}`
    const keys = technology === 'modular' ? ['standard', 'project', 'turnkey'] : ['start', 'standard', 'project']
    const result = await api.post('/api/projects', { data: { name: `Тест ${badge}`, slug, recordType: 'project', technologyBadge: badge, areaValue: 100, floorsValue: 1, bedrooms: 2, bathrooms: 1, imageUrl: '/factory-open-day/hero.webp', _status: 'published', configurations: keys.map((key, i) => ({ key, name: key, price: i === 0 ? 0 : (i + 1) * 1000000 })) } })
    expect(result.status()).toBe(201)
    projects.push({ id: (await result.json()).doc.id, slug, badge })
  }
})
test.afterAll(async () => {
  if (!api) return
  for (const project of projects) await api.delete(`/api/projects/${project.id}`)
  await api.dispose()
})

for (const width of [1366, 390]) test(`frame cards preserve approved copy, no gifts, layout and selection at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/catalog/${projects[0]!.slug}`, { waitUntil: 'domcontentloaded' })
  const consent = page.getByRole('button', { name: 'Необходимые', exact: true })
  if (await consent.isVisible()) await consent.click()
  const cards = page.locator('.project-config__tier')
  await expect(cards).toHaveCount(3)
  await expect(cards.locator('.project-config__tier-name')).toHaveText(['Стартовая', 'Стандартная', 'Проектная'])
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
  expect((await cards.locator('.project-config__tier-lead').allTextContents()).map(normalize)).toEqual(['Силовой каркас, кровля и наружная отделка — основа для дальнейшего обустройства дома.', 'Утеплённый дом с окнами и входной дверью. Подготовлен к внутренней отделке.', 'Внутренние стены и основание пола подготовлены к дальнейшей отделке.'])
  expect((await cards.locator('.project-config__tier-includes-title').allTextContents()).map(normalize)).toEqual(['Всё необходимое для начала:', 'Дополнительно к стартовой комплектации:', 'Дополнительно к стандартной комплектации:'])
  await expect(cards.nth(0).locator('.project-config__tier-included')).toHaveCount(4)
  await expect(cards.nth(1).locator('.project-config__tier-included')).toHaveCount(4)
  await expect(cards.nth(2).locator('.project-config__tier-included')).toHaveCount(3)
  await expect(page.locator('.project-config__tier-gifts')).toHaveCount(0)
  await expect(cards.nth(0).locator('.project-config__tier-price')).toHaveText('Цена уточняется')
  await cards.nth(0).click()
  await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.project-config')).not.toContainText('Доставка и сборка включены')
  await cards.nth(2).click()
  await expect(cards.nth(2)).toHaveAttribute('aria-pressed', 'true')
  await cards.nth(0).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  for (const card of await cards.all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy()
  if (width >= 800) {
    const heights = await cards.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height))
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1)
  }
  await page.locator('.project-config__tiers').screenshot({ path: `C:/Users/Nikita/AppData/Local/Temp/avgst-frame-cards-${width}.png` })
  expect(errors).toEqual([])
})

test('CMS edits only the frame group and its preview uses frame content', async ({ browser, page }) => {
  const baseline = (await (await api.get(`/api/blocks/${block.id}?depth=0`)).json()).configurationTemplates
  const context = await browser.newContext({ storageState: await api.storageState() })
  const editor = await context.newPage()
  try {
    await editor.goto(`${cms}/collections/blocks/${block.id}`, { waitUntil: 'domcontentloaded' })
    await editor.getByRole('button', { name: 'Каркасные дома', exact: true }).click()
    await editor.locator('.configuration-editor-tabs:visible').getByRole('button', { name: 'Стартовая', exact: true }).click()
    const lead = editor.locator('.configuration-tier-group:visible').getByLabel('Краткое описание', { exact: true })
    await expect(lead).toHaveValue('Заводская точность, свобода дальнейших решений.')
    const preview = editor.frameLocator('.configuration-editor-preview iframe')
    await expect(preview.locator('.project-config__tier-gifts')).toHaveCount(0)
    await expect(preview.locator('.project-config__tier-lead').first()).toContainText('Заводская точность')
    await lead.fill('Проверка изоляции каркасной технологии')
    const saved = editor.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === `/api/blocks/${block.id}`)
    await editor.getByRole('button', { name: 'Сохранить', exact: true }).click()
    expect((await saved).ok()).toBeTruthy()
    const after = (await (await api.get(`/api/blocks/${block.id}?depth=0`)).json()).configurationTemplates
    expect(after.panel).toEqual(baseline.panel)
    expect(after.modular).toEqual(baseline.modular)
    expect(after.frame.start.lead).toBe('Проверка изоляции каркасной технологии')
    await page.goto(`/catalog/${projects[0]!.slug}`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.project-config__tier-lead').first()).toContainText('Проверка изоляции')
    for (const project of projects.slice(1)) {
      await page.goto(`/catalog/${project.slug}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.project-config__tiers')).not.toContainText('Проверка изоляции')
    }
  } finally {
    await api.patch(`/api/blocks/${block.id}`, { data: { configurationTemplates: baseline } })
    await context.close()
  }
})
