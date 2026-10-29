import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
  test(`project form unfolds to its content height at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(process.env.MORTGAGE_TEST_PATH || '/catalog/barnhouse-57');
    const configuration = page.locator('.project-config__total-label');
    await expect(configuration).toContainText('Комплектация:');
    await expect(configuration.locator('strong')).not.toBeEmpty();
    const calc = page.locator('#mortgage-calc');
    const reveal = calc.locator('.mortgage-calc__reveal--project');
    await expect(reveal).toBeVisible();
    await expect(reveal.locator('.mortgage-calc__receipt dt')).toHaveText(['Стоимость дома', 'Первый взнос']);
    const before = await reveal.boundingBox();
    const hiddenName = reveal.getByRole('textbox', { name: 'Имя', exact: true });
    await expect(hiddenName).toHaveCount(0);
    await reveal.getByRole('button', { name: 'Рассчитать ипотеку', exact: true }).click();
    await expect(reveal).toHaveClass(/is-open/);
    await expect(reveal.locator('.mortgage-calc__quote-name')).not.toBeEmpty();
    await expect(reveal.locator('.mortgage-calc__quote-rate')).toHaveText('Семейная ипотека под 6%');
    await expect(reveal.locator('.mortgage-calc__quote-pay')).toContainText('Платёж от');
    await expect(reveal.getByRole('textbox', { name: 'Имя', exact: true })).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.mortgage-request')!.getAnimations({ subtree: true }).length === 0);
    const after = await reveal.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);
    expect(await reveal.locator('.mortgage-request__summary').getAttribute('inert')).not.toBeNull();
    await expect(calc.locator('.mortgage-calc__result')).toHaveCSS('background-color', 'rgb(11, 16, 32)');
    await page.screenshot({ path: `test-results/mortgage-request-${width}.png` });
    await reveal.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(reveal).not.toHaveClass(/is-open/);
    await expect(reveal.getByRole('button', { name: 'Рассчитать ипотеку', exact: true })).toBeVisible();
    const configurationPanel = page.locator('.project-config__total');
    await configurationPanel.getByRole('button', { name: 'Получить смету', exact: true }).click();
    await expect(configurationPanel).toHaveAttribute('data-form', 'true');
    const panelRect = await configurationPanel.boundingBox();
    const closeRect = await configurationPanel.getByRole('button', { name: 'Закрыть', exact: true }).boundingBox();
    expect(closeRect!.y - panelRect!.y).toBeGreaterThanOrEqual(16);
    expect(closeRect!.y - panelRect!.y).toBeLessThanOrEqual(18);
    await expect(configurationPanel.getByRole('textbox', { name: 'Имя', exact: true })).toBeVisible();
    await configurationPanel.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(configurationPanel).toHaveAttribute('data-form', 'false');
    await expect(configurationPanel.getByRole('button', { name: 'Получить смету', exact: true })).toBeFocused();
    await expect(configurationPanel.getByRole('textbox', { name: 'Имя', exact: true })).toHaveCount(0);
  });
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`mortgage program form unfolds and closes with ${reducedMotion} motion`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/family-mortgage');
    const reveal = page.locator('#mortgage-calc .mortgage-request');
    await reveal.getByRole('button', { name: 'Рассчитать ипотеку', exact: true }).click();
    await expect(reveal.getByRole('textbox', { name: 'Имя', exact: true })).toBeVisible();
    await expect(reveal.locator('.mortgage-calc__quote-pay')).toContainText('Платёж от');
    await reveal.getByRole('button', { name: 'Закрыть', exact: true }).click();
    await expect(reveal.getByRole('button', { name: 'Рассчитать ипотеку', exact: true })).toBeFocused();
  });
}
