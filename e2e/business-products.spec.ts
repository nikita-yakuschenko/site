import { expect, test } from '@playwright/test'

for (const width of [320, 359, 390, 719, 720, 768, 1024, 1440]) {
  test(`business product cards keep animations without navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/business')
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)
    const grid = page.locator('.business-product-bento')
    await expect(grid.locator('a, .company-bento__go')).toHaveCount(0)
    await expect(grid.locator('article')).toHaveCount(6)
    for (const id of ['prefab', 'modules']) {
      const card = grid.locator(`.business-product-bento__${id}`)
      const image = card.locator('img')
      await image.evaluate((el) => (el as HTMLImageElement).decode())
      if (id === 'prefab') {
        const panel = await card.evaluate((el) => {
          const image = el.querySelector('img')!
          const card = el.getBoundingClientRect()
          const bounds = image.getBoundingClientRect()
          const scale = Math.min(bounds.width / 1672, bounds.height / 941)
          const left = bounds.left + (bounds.width - scale * 1672) / 2 + 452 * scale
          const top = bounds.top + bounds.height - scale * 941 + 11 * scale
          const right = left + (1225 - 452) * scale
          const bottom = top + (935 - 11) * scale
          const copy = el.querySelector('.business-product-bento__copy')!.getBoundingClientRect()
          return {
            fits: left >= card.left && top >= card.top && right <= card.right && bottom <= card.bottom,
            clearOfCopy: left >= copy.right || top >= copy.bottom,
            bottomGap: card.bottom - bottom,
          }
        })
        expect(panel.fits).toBe(true)
        expect(panel.clearOfCopy).toBe(true)
        expect(panel.bottomGap).toBeGreaterThanOrEqual(16)
      }
      await card.getByRole('heading').hover()
      await expect(image).toHaveCSS('transform', 'matrix(1.04, 0, 0, 1.04, 0, 0)')
      await card.getByRole('heading').click()
      await expect(page).toHaveURL(/\/business$/)
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('non-link product cards respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/business')
  await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
  const card = page.locator('.business-product-bento__prefab')
  await card.getByRole('heading').hover()
  await expect(card.locator('img')).toHaveCSS('transform', 'none')
})
