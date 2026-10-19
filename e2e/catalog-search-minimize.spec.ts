import { test, expect } from '@playwright/test';

test('desktop search stays 240px wide while editing and after results', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/catalog');
  const row = page.locator('.catalog__barrow');
  const input = page.getByRole('searchbox');
  await expect(input).toBeVisible();
  await expect.poll(async () => (await row.boundingBox())!.width).toBe(240);
  await input.fill('Барнхаус');
  await input.press('Enter');
  await expect(page).toHaveURL(/q=/);
  await expect(input).toBeVisible();
  await input.click();
  await expect(input).toBeFocused();
  await expect.poll(async () => (await row.boundingBox())!.width).toBe(240);
  const ready = page.getByRole('checkbox', { name: 'Готовый дом в продаже' });
  const favorites = page.getByRole('button', { name: /Только избранное/ });
  await expect(ready).toBeVisible();
  expect((await ready.boundingBox())!.y).toBeGreaterThan((await favorites.boundingBox())!.y);
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await expect(input).toHaveValue('');
  await expect.poll(async () => (await row.boundingBox())!.width).toBe(240);
  await page.screenshot({ path: 'test-results/catalog-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(input).toBeVisible();
  await expect.poll(async () => (await row.boundingBox())!.width).toBeGreaterThan(240);
  await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: false });
});
