import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/yandex-rating', route => route.fulfill({ json: { rating: 4.7 } }))
})

test('filters retain the correct stories and years', async ({ page }) => {
  await page.goto('/stories')
  await page.getByRole('button', { name: 'Смотреть истории', exact: true }).click()
  await expect(page.locator('#stories')).toBeInViewport()
  await expect(page).not.toHaveURL(/#stories$/)
  await expect(page.getByRole('dialog', { name: 'Симпл 57' })).toHaveCount(0)
  await expect(page.locator('main article')).toHaveCount(2)
  await page.getByRole('navigation', { name: 'Год заселения или запуска' }).getByRole('button', { name: '2023', exact: true }).click()
  await expect(page.locator('main article')).toHaveCount(1)
  await expect(page.locator('#story-simple-57')).toBeVisible()
  await expect(page).not.toHaveURL(/#story-/)
  await page.getByRole('navigation', { name: 'Год заселения или запуска' }).getByRole('button', { name: '2024', exact: true }).click()
  await page.getByRole('combobox', { name: 'Тип историй' }).click()
  await page.getByRole('option', { name: 'Бизнес', exact: true }).click()
  await expect(page.locator('main article')).toHaveCount(1)
  await expect(page.locator('#story-modular-hotel')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Год заселения или запуска' }).getByRole('button', { name: '2023', exact: true })).toBeDisabled()
  await expect(page.getByRole('status')).toHaveText('Показано: 1 из 3')
  await page.getByRole('combobox', { name: 'Тип историй' }).click()
  await page.getByRole('option', { name: 'Частные лица', exact: true }).click()
  await expect(page.locator('main article')).toHaveCount(1)
  await expect(page.locator('#story-simple-49')).toBeVisible()
  await expect(page.locator('#story-modular-hotel')).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Тип историй' }).click()
  await page.getByRole('option', { name: 'Все истории', exact: true }).click()
  await expect(page.locator('main article')).toHaveCount(2)
})

test('direct story links, descriptions, video consent and keyboard dismissal', async ({ page }) => {
  const embeds: string[] = []
  page.on('request', request => { if (request.url().includes('kinescope.io')) embeds.push(request.url()) })
  await page.goto('/stories#story-simple-57')
  const story = page.locator('#story-simple-57')
  await expect(story).toBeInViewport()
  const play = story.getByRole('button', { name: 'Смотреть видео: Симпл 57', exact: true })
  await play.click()
  await expect(page.getByRole('dialog', { name: 'Симпл 57' })).toBeVisible()
  await expect(page.getByText('Для просмотра видео разрешите функциональные cookie.')).toBeVisible()
  expect(embeds).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Симпл 57' })).toHaveCount(0)
  await expect(play).toBeFocused()
})

test('desktop and phone layouts have no horizontal overflow', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/stories')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      elements: Array.from(document.querySelectorAll('main *')).filter(element => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 8).map(element => ({ className: element.className, right: element.getBoundingClientRect().right })),
    }))
    expect(overflow.scrollWidth, JSON.stringify({ viewport: width, ...overflow })).toBeLessThanOrEqual(overflow.width)
    const headingSize = await page.getByRole('heading', { level: 1 }).evaluate(element => parseFloat(getComputedStyle(element).fontSize))
    expect(headingSize).toBeGreaterThanOrEqual(24)
    expect(headingSize).toBeLessThanOrEqual(30)
    await expect(page.getByRole('combobox', { name: 'Тип историй' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Тип историй' })).toContainText('Все истории')
    const years = page.getByRole('navigation', { name: 'Год заселения или запуска' }).getByRole('button')
    await expect(years.first()).toHaveText('2026')
    await expect(years.last()).toHaveText('2014')
    await expect(years.first()).toBeDisabled()
    await expect(page.getByRole('navigation', { name: 'Год заселения или запуска' }).getByRole('button', { name: '2024', exact: true })).toHaveAttribute('aria-current', 'date')
    const necessary = page.getByRole('button', { name: 'Необходимые', exact: true })
    if (await necessary.isVisible()) await necessary.click()
    await expect(page.getByRole('link', { name: /4,7 Наш рейтинг/ })).toBeVisible()
    if (width !== 320) {
      await page.screenshot({ path: `output/stories/${width === 1440 ? 'desktop' : 'mobile'}.png`, fullPage: true })
      await page.screenshot({ path: `output/stories/${width === 1440 ? 'desktop' : 'mobile'}-viewport.png` })
    }
  }
})
