import { expect, test } from '@playwright/test'

for (const width of [320, 375, 390, 768, 960, 1024, 1440]) {
  test(`business hero without a panel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/business')
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    const hero = page.locator('.b2b-hero')
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(
      'Развивайте свой бизнес с Авангард Строй',
    )
    await expect(hero.locator('h1 .page-hero__accent')).toHaveText('Развивайте свой бизнес')
    await expect(hero.locator('h1 .page-hero__accent')).toHaveCSS('color', 'rgb(252, 201, 12)')
    const image = hero.getByRole('img')
    await expect(image).toHaveAttribute('src', /b2b_hero/)
    await image.evaluate((el) => (el as HTMLImageElement).decode())
    await page.evaluate(() => document.fonts.ready)
    const styles = await hero.evaluate((el) => {
      const heroStyle = getComputedStyle(el)
      const heading = el.querySelector('h1')!
      return {
        background: heroStyle.backgroundColor,
        border: heroStyle.borderWidth,
        radius: heroStyle.borderRadius,
        headingSize: parseFloat(getComputedStyle(heading).fontSize),
        accentSize: parseFloat(getComputedStyle(heading.querySelector('.page-hero__accent')!).fontSize),
        headingOverflow: heading.scrollWidth > heading.clientWidth,
      }
    })
    expect(styles.background).toBe('rgba(0, 0, 0, 0)')
    expect(styles.border).toBe('0px')
    expect(styles.radius).toBe('0px')
    expect(styles.headingSize).toBeGreaterThanOrEqual(24)
    expect(styles.headingSize).toBeLessThanOrEqual(30)
    expect(styles.accentSize).toBe(styles.headingSize)
    expect(styles.headingOverflow).toBe(false)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(hero.locator('p')).toHaveCount(1)
    await expect(hero.locator('.page-hero__description p')).toHaveText(
      'Сократите сроки строительства, себестоимость проектов и увеличьте прибыль, используя готовые решения от Авангард Строй.',
    )
    await expect(hero.locator('ul, a')).toHaveCount(0)
    await expect(hero.getByRole('button')).toHaveCount(1)
    await hero.getByRole('button', { name: 'Начать сотрудничество', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Начать сотрудничество', exact: true })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
}
