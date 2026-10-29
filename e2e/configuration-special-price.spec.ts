import { test, expect } from '@playwright/test'
import { defaultConfigurationTemplates } from '../src/lib/catalog/configuration-content'
import { formatFromRub } from '../src/lib/locale'
import { monthlyPaymentForProject } from '../src/lib/mortgage'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('avgst:cookie-notice-dismissed', '1'))
  await page.route(/yandex|roistat|one2click|mail\.ru|\/next\/leads|\/api\/(?:views|reactions|consent)/, route => route.abort())
})

for (const width of [1440, 390]) test(`special price and ordinary-price mortgage at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/catalog/barnhouse-76')
  const section = page.locator('section[data-cms-block="ProjectConfig"]')
  const cards = section.locator('.project-config__tier')
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(1).locator('.project-config__tier-price')).toHaveText(/Специальная цена\s*1\s*700\s*000\s*руб\./)
  await expect(section).not.toContainText(/2\s*000\s*000\s*руб/)
  const payment = formatFromRub(monthlyPaymentForProject({ propertyPrice: 2000000, region: 'nn' }))
  const panel = width < 800 ? section.locator('.project-config__tier-card').nth(1).locator('.project-config__mobile-form') : section.locator('aside.project-config__total')
  if (width < 800) await section.locator('.project-config__mobile-quote').nth(1).click()
  await expect(panel.locator('.project-config__total-sum')).toHaveText(/Специальная цена\s*1\s*700\s*000\s*руб\./)
  await expect(panel.locator('.project-config__mortgage-label')).toHaveText('В ипотеку')
  await expect(panel.locator('.project-config__mortgage-payment')).toContainText(payment)
  await expect(panel.getByRole('button', { name: 'Получить смету', exact: true }).first()).toBeVisible()
  if (width >= 800) {
    await panel.getByRole('button', { name: 'Получить смету', exact: true }).click()
    await expect(panel.locator('button[type="submit"]')).toHaveText(/Получить смету/)
  }
  await page.waitForTimeout(800)
  await section.screenshot({ path: `output/configuration-special-price-${width}.png` })
})

for (const width of [1440, 390]) test(`frame rename and separate gift items at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.addInitScript(() => window.addEventListener('message', event => { if (event.data?.type === 'avgst:configurations-ready') (window as unknown as { configurationReady: boolean }).configurationReady = true }))
  await page.goto('/cms-preview/configurations')
  await page.waitForFunction(() => (window as unknown as { configurationReady?: boolean }).configurationReady)
  const templates = defaultConfigurationTemplates()
  templates.frame.project.gifts = [{ text: 'Клееные элементы дома' }, { text: 'Утепление перекрытий, пола и крыши 200 мм' }, { text: 'Покраска дома финскими морозостойкими красками' }]
  await page.evaluate(templates => window.dispatchEvent(new MessageEvent('message', { origin: 'http://localhost:3001', source: window, data: { type: 'avgst:preview-configurations', variant: 'frame', templates } })), templates)
  const card = page.locator('.project-config__tier').nth(2)
  await expect(page.locator('.project-config__tiers')).toHaveCSS('display', 'grid')
  await expect(card.locator('.project-config__tier-name')).toHaveText('Расширенная')
  await expect(card.locator('[role="listitem"]')).toHaveCount(3)
  await expect(card.locator('[role="listitem"]').nth(1)).toHaveText('Утепление перекрытий, пола и крыши 200 мм')
  await page.locator('section[data-cms-block="ProjectConfig"]').screenshot({ path: `output/configuration-gifts-${width}.png` })
})
