import { test, expect } from '@playwright/test';

test('mobile project hero question opens the shared dialog beside the mortgage payment', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/catalog/barnhouse-113');
  const hero = page.locator('.project-hero');
  const question = hero.getByRole('button', { name: 'Задать вопрос', exact: true });
  for (const width of [320, 375, 440, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(question).toBeVisible();
    const button = await question.boundingBox();
    const payment = await hero.locator('.project-hero__aside').boundingBox();
    expect(button!.x + button!.width).toBeLessThanOrEqual(payment!.x);
    expect(Math.abs(button!.y + button!.height / 2 - payment!.y - payment!.height / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await question.click();
  const dialog = page.getByRole('dialog', { name: 'Задать вопрос' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Имя', exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Сообщение', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(question).toBeHidden();
});
