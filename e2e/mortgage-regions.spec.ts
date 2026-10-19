import { test, expect } from '@playwright/test';
import { MORTGAGE_REGIONS, mortgageRegionGroup, mortgageRegionLabel, searchMortgageRegions } from '../src/components/mortgage-regions';
import { getMortgageProgram, subsidizedLimit } from '../src/lib/mortgage/programs';

test('region search uses word prefixes and all four capital regions get capital limits', () => {
  expect(MORTGAGE_REGIONS).toHaveLength(89);
  expect(new Set(MORTGAGE_REGIONS).size).toBe(89);
  expect(searchMortgageRegions(' Ар ')).toEqual(['Архангельская область']);
  expect(searchMortgageRegions('мос обл')).toEqual(['Московская область']);
  expect(searchMortgageRegions('якут')).toEqual(['Республика Саха (Якутия)']);
  expect(searchMortgageRegions('несуществующий')).toEqual([]);
  expect(mortgageRegionLabel('Кемеровская область — Кузбасс')).toBe('Кемеровская область');
  expect(searchMortgageRegions('ХМАО')).toEqual(['Ханты-Мансийский автономный округ — Югра']);
  expect(searchMortgageRegions('ханты манс')).toEqual(searchMortgageRegions('ХМАО'));
  expect(searchMortgageRegions('Ямало')).toEqual(searchMortgageRegions('ЯНАО'));
  expect(mortgageRegionLabel(searchMortgageRegions('ненецкий')[0]!)).toBe('Ненецкий АО');
  const capitals = ['Москва', 'Московская область', 'Санкт-Петербург', 'Ленинградская область'];
  for (const name of MORTGAGE_REGIONS) {
    const group = mortgageRegionGroup(name);
    expect(group).toBe(capitals.includes(name) ? 'msk' : 'nn');
    for (const children of [1, 2, 3]) {
      expect(subsidizedLimit(getMortgageProgram('family'), group, children)).toBe(
        (capitals.includes(name) ? [12, 15, 18] : [6, 8, 10])[children - 1]! * 1e6,
      );
    }
  }
});

for (const route of ['/family-mortgage']) {
test(`region selection works without changing house price: ${route}`, async ({ page }) => {
  await page.goto(route);
  const calc = page.locator('#mortgage-calc');
  const region = calc.getByRole('combobox', { name: 'Регион строительства' });
  await expect(region).toBeEnabled();
  const price = calc.getByRole('textbox', { name: 'Стоимость дома' });
  const initialPrice = await price.inputValue();
  await region.click();
  await expect(region).toHaveAttribute('aria-expanded', 'true');
  await region.fill('Ар');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toHaveText('Архангельская область');
  await region.press('Enter');
  await expect(region).toHaveValue('Архангельская область');
  await region.fill('Лен');
  await region.press('Enter');
  await expect(region).toHaveValue('Ленинградская область');
  await expect(calc.locator('.mortgage-calc__program-note')).toContainText('12 000 000');
  await expect(price).toHaveValue(initialPrice);
  await region.fill('неттакогорегиона');
  await expect(page.getByRole('status').filter({ hasText: 'Регион не найден' })).toBeVisible();
  await region.press('Escape');
  await expect(region).toHaveValue('Ленинградская область');
});


}
