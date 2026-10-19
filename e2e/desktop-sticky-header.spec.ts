import { test, expect } from '@playwright/test';

for (const route of ['/manufacture', '/catalog']) {
  test(`desktop main header stays visible on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(route);
    const plaque = page.locator('.site-header__plaque');
    await expect.poll(() => page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-offset')))).toBeGreaterThan(0);
    await page.evaluate(() => document.fonts.ready);
    const initial = await plaque.boundingBox();
    await page.evaluate(() => window.scrollTo(0, 320));
    await expect(page.locator('.site-header')).toHaveClass(/is-stuck/);
    await expect.poll(async () => (await plaque.boundingBox())!.y).toBe(16);
    const technical = await page.locator('.site-header__bar').boundingBox();
    expect(technical!.y + technical!.height).toBeLessThanOrEqual(0);
    if (route === '/catalog') {
      const search = await page.getByRole('searchbox').boundingBox();
      const fixed = await plaque.boundingBox();
      expect(search!.y).toBeGreaterThanOrEqual(fixed!.y + fixed!.height);
    }
    await page.screenshot({ path: `test-results/sticky-${route === '/manufacture' ? 'manufacture' : 'catalog'}.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.site-header')).not.toHaveClass(/is-stuck/);
    await expect.poll(async () => (await plaque.boundingBox())!.y).toBe(initial!.y);
    await page.setViewportSize({ width: 390, height: 720 });
    await page.evaluate(() => window.scrollTo(0, 320));
    await expect(page.locator('.site-header')).not.toHaveClass(/is-stuck/);
    await expect.poll(async () => (await plaque.boundingBox())!.y).toBeLessThan(0);
  });
}
