import { expect, test } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`filter controls acknowledge clicks before results arrive (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/catalog', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector<HTMLElement>('.catalog__sidebar')?.style.getPropertyValue('--catalog-filter-height'));
    if (width < 1024) await page.getByRole('button', { name: 'Фильтрация', exact: true }).click();
    const panel = page.locator(width < 1024 ? '.cfilter--popover' : '.cfilter--desktop');
    const choices = panel.locator('.cfilter__group--quiet input[type="checkbox"]');
    await expect(choices.first()).toBeVisible();

    // Hold all server component responses: controls must work independently
    // of network speed, including successive choices and cancellation.
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let requests = 0;
    await page.route('**/catalog?**', async route => {
      if (route.request().headers()['rsc'] === '1') {
        requests++;
        await held;
      }
      await route.continue();
    });
    try {
      await choices.nth(0).click();
      await expect(choices.nth(0)).toBeChecked({ timeout: 500 });
      await expect(page.locator('.catalog__results')).toHaveAttribute('aria-busy', 'true');
      await page.screenshot({ path: `test-results/filter-feedback-${width}.png` });
      await choices.nth(0).click();
      await expect(choices.nth(0)).not.toBeChecked({ timeout: 500 });
      await choices.nth(0).click();
      await expect(choices.nth(0)).toBeChecked({ timeout: 500 });
      for (const label of ['Количество спален', 'Количество этажей', 'Количество санузлов']) {
        const group = panel.getByRole('group', { name: label });
        const button = group.getByRole('button').first();
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
      }
      await expect.poll(() => requests).toBeGreaterThan(0);
    } finally {
      release();
    }
    await expect(page.locator('.catalog__results')).toHaveAttribute('aria-busy', 'false');
    await expect(choices.nth(0)).toBeChecked();
    for (const label of ['Количество спален', 'Количество этажей', 'Количество санузлов']) {
      await expect(panel.getByRole('group', { name: label }).getByRole('button').first()).toHaveAttribute('aria-pressed', 'true');
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector<HTMLElement>('.catalog__sidebar')?.style.getPropertyValue('--catalog-filter-height'));
    if (width < 1024) await page.getByRole('button', { name: /^Фильтрация/ }).click();
    await expect(choices.nth(0)).toBeChecked();
  });
}

