import { test, expect } from '@playwright/test';

for (const route of ['/catalog']) {
  test(`desktop main header stays visible on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(route);
    const plaque = page.locator('.site-header__plaque');
    await expect.poll(() => page.evaluate(() => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-offset')))).toBeGreaterThan(0);
    await page.evaluate(() => document.fonts.ready);
    if (route === '/catalog') {
      // Keep enough result rows below the sidebar to exercise its sticky position.
      await page.addStyleTag({ content: '.catalog__results { min-height: 2000px; }' });
    }
    const gaps = () => page.evaluate(() => {
      const header = document.querySelector('.site-header__plaque')!.getBoundingClientRect();
      const search = document.querySelector('.catalog-search')!.getBoundingClientRect();
      const filters = document.querySelector('.cfilter__scroll')!.getBoundingClientRect();
      return {
        headerToSearch: search.top - header.bottom,
        searchToFilters: filters.top - search.bottom,
        groups: Array.from(document.querySelectorAll('.cfilter__group')).map(group => group.getBoundingClientRect().top - search.bottom),
      };
    });
    const initialGaps = route === '/catalog' ? await gaps() : null;
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
    if (initialGaps) {
      const stickyGaps = await gaps();
      expect(stickyGaps.headerToSearch).toBeCloseTo(initialGaps.headerToSearch, 0);
      expect(stickyGaps.searchToFilters).toBeCloseTo(initialGaps.searchToFilters, 0);
      expect(stickyGaps.groups).toHaveLength(initialGaps.groups.length);
      stickyGaps.groups.forEach((position, index) => expect(position).toBeCloseTo(initialGaps.groups[index], 0));
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

test('other sections keep a scrolling header on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/manufacture');
  await expect(page.locator('.site-header__plaque')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 320));
  await expect(page.locator('.site-header')).not.toHaveClass(/is-stuck/);
  await expect.poll(async () => (await page.locator('.site-header__plaque').boundingBox())!.y).toBeLessThan(0);
});
