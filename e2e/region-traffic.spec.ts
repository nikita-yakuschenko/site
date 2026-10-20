import { test, expect } from '@playwright/test';
import { regionFromSearch } from '../src/lib/region-traffic';

test('метка Москвы распознаётся только отдельным токеном', () => {
  for (const query of ['?utm_campaign=house_msk_2026', '?utm_source=https%3A%2F%2Fmsk.avgst.ru', '?region=MSK', '?utm_source=%ZZ&campaign=msk']) {
    expect(regionFromSearch(query)).toBe('msk');
  }
  for (const query of ['', '?utm_source=omsk.avgst.ru', '?city=tomsk', '?campaign=msk123', '?q=нижний']) {
    expect(regionFromSearch(query)).toBeNull();
  }
});

test('регион определяется на сервере и не смешивается между посетителями', async ({ browser }) => {
  const moscow = await browser.newContext({ javaScriptEnabled: false });
  const defaultRegion = await browser.newContext({ javaScriptEnabled: false });
  const mskPage = await moscow.newPage();
  const nnPage = await defaultRegion.newPage();
  await Promise.all([mskPage.goto('/family-mortgage?utm_campaign=house_msk', { waitUntil: 'domcontentloaded' }), nnPage.goto('/family-mortgage', { waitUntil: 'domcontentloaded' })]);
  await expect(mskPage.locator('.site-region__label')).toHaveText('Московская область');
  await expect(nnPage.locator('.site-region__label')).toHaveText('Нижний Новгород');
  await mskPage.goto('/family-mortgage', { waitUntil: 'domcontentloaded' });
  await expect(mskPage.locator('.site-region__label')).toHaveText('Московская область');
  await moscow.close();
  await defaultRegion.close();
});

test('ручной выбор сохраняется после перехода и перезагрузки', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/family-mortgage?utm_source=msk', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.site-region__label')).toHaveText('Московская область');
  await page.locator('.site-region__trigger').click();
  await page.getByRole('option', { name: 'Нижний Новгород' }).click();
  await expect(page.locator('.site-region__label')).toHaveText('Нижний Новгород');
  await page.goto('/family-mortgage', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.site-region__label')).toHaveText('Нижний Новгород');
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'avgst_region');
  expect(cookie?.value).toBe('nn');
  expect(cookie?.expires).toBe(-1);
  expect(errors.filter(error => /hydration|region/i.test(error))).toEqual([]);
});
