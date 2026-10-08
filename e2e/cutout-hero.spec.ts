import { expect, test } from '@playwright/test'

const routes = ['/it-mortgage', '/agro-mortgage', '/basic-mortgage', '/business', '/family-mortgage', '/manufacture']

for (const width of [320, 359, 360, 375, 390, 399, 400, 430, 599, 600, 768, 799, 800, 899, 900, 959, 960, 961, 1023, 1024, 1199, 1200, 1279, 1280, 1440, 1920]) {
  test(`six page heroes share their geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const geometry: Record<string, number>[] = []
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => document.fonts.ready)
      const hero = page.locator('.page-hero')
      await expect(hero).toBeVisible()
      const image = hero.locator('img')
      await image.evaluate((el) => (el as HTMLImageElement).decode())
      await expect(image).not.toHaveAttribute('src', /\/_next\/image/)
      const result = await hero.evaluate((el) => {
        const section = el.closest('section')!
        const heading = el.querySelector('h1')!
        const description = el.querySelector('.page-hero__description')!
        const actions = el.querySelector('.page-hero__actions')!
        const button = actions.querySelector('button')!
        const image = el.querySelector('img')!
        const bounds = el.getBoundingClientRect()
        const nextSection = section.nextElementSibling!
        const nextHeading = nextSection.querySelector('h2')!
        const headingBounds = heading.getBoundingClientRect()
        const buttonBounds = button.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(heading)
        const textBounds = range.getBoundingClientRect()
        return {
          geometry: {
            heroTop: bounds.top,
            heroHeight: bounds.height,
            sectionHeight: section.getBoundingClientRect().height,
            headingX: headingBounds.left,
            headingY: headingBounds.top,
            buttonX: buttonBounds.left,
            buttonY: buttonBounds.top,
            nextSectionTop: nextSection.getBoundingClientRect().top,
            nextHeadingY: nextHeading.getBoundingClientRect().top,
          },
          transparentSection: getComputedStyle(section).backgroundColor === 'rgba(0, 0, 0, 0)',
          transparentHero: getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)',
          fontSize: parseFloat(getComputedStyle(heading).fontSize),
          headingFits: textBounds.bottom <= description.getBoundingClientRect().top,
          descriptionFits: description.scrollHeight <= description.clientHeight,
          containsImage: getComputedStyle(image).objectFit === 'contain',
          clipping: [el, image.parentElement!].some((node) => ['hidden', 'clip'].includes(getComputedStyle(node).overflow)),
          overflow: document.documentElement.scrollWidth > innerWidth,
        }
      })
      const banner = route === '/family-mortgage' || route === '/manufacture'
      expect(result.transparentSection, route).toBe(true)
      expect(result.transparentHero, route).toBe(!banner)
      expect(result.fontSize).toBeGreaterThanOrEqual(24)
      expect(result.fontSize).toBeLessThanOrEqual(30)
      expect(result.headingFits, route).toBe(true)
      expect(result.descriptionFits, route).toBe(true)
      expect(result.containsImage, route).toBe(!banner)
      if (!banner) expect(result.clipping, route).toBe(false)
      expect(result.overflow, route).toBe(false)
      geometry.push(result.geometry)
    }
    const reference = geometry[0]!
    for (const result of geometry.slice(1)) {
      for (const key of Object.keys(reference)) {
        expect(Math.abs(result[key]! - reference[key]!), key).toBeLessThan(0.5)
      }
    }
  })
}
