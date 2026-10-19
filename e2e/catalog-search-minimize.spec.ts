import { test, expect } from '@playwright/test';

test('search minimizes after results arrive and expands on click', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/catalog');
  const row = page.locator('.catalog__barrow');
  const input = page.getByRole('searchbox');
  await expect(input).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 250));
  await expect(page.locator('.catalog__bar')).not.toHaveClass(/is-search-compact/);
  await input.fill('Барнхаус');
  await input.press('Enter');
  const expand = page.getByRole('button', { name: 'Развернуть поиск по проектам' });
  await expect(expand).toBeVisible();
  await expect(expand).toContainText('Барнхаус');
  await expect.poll(async () => (await row.boundingBox())!.width).toBe(240);
  await expand.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Барнхаус');
  await expect.poll(async () => (await row.boundingBox())!.width).toBeGreaterThan(900);
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await expect(input).toHaveValue('');
  await expect(page.locator('.catalog__bar')).not.toHaveClass(/is-search-compact/);
});
