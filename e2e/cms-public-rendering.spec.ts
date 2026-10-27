import { expect, test } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`public static sections do not hydrate CMS editor markup (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true');
    const heading = await page.locator('main h1').innerText();
    const sections = await page.locator('main h2').allTextContents();
    expect(sections.length).toBeGreaterThan(2);
    await expect(page.locator('cms-text')).toHaveCount(0);
    await expect(page.locator('[data-cms-content-index]')).toHaveCount(0);

    await page.goto('/?cmsIndex=1&cmsPreview=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true');
    await expect(page.locator('cms-text').first()).toBeAttached();
    await expect(page.locator('[data-cms-content-index]').first()).toBeAttached();
    await expect(page.locator('main h1')).toHaveText(heading);
    expect(await page.locator('main h2').allTextContents()).toEqual(sections);
  });
}
