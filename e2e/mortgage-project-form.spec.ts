import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
  test(`project form replaces calculation without changing panel height at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(process.env.MORTGAGE_TEST_PATH || '/catalog/barnhouse-57');
    const calc = page.locator('#mortgage-calc');
    const panel = calc.locator('.mortgage-calc__panel');
    const reveal = calc.locator('.mortgage-calc__reveal--project');
    await expect(reveal).toBeVisible();
    const before = await panel.boundingBox();
    await reveal.getByRole('button', { name: 'Получить расчёт', exact: true }).click();
    await expect(reveal).toHaveClass(/is-open/);
    await expect(reveal.locator('.mortgage-calc__quote-name')).not.toBeEmpty();
    await expect(reveal.locator('.mortgage-calc__quote-rate')).toHaveText('Семейная ипотека под 6%');
    await expect(reveal.locator('.mortgage-calc__quote-pay')).toContainText('Платёж от');
    await expect(reveal.getByRole('textbox', { name: 'Имя', exact: true })).toBeVisible();
    const after = await panel.boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThan(1);
    expect(await reveal.locator('.mortgage-calc__reveal-copy').getAttribute('inert')).not.toBeNull();
    await reveal.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(reveal).not.toHaveClass(/is-open/);
    await expect(reveal.getByRole('button', { name: 'Получить расчёт', exact: true })).toBeVisible();
  });
}
