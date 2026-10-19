import { test, expect } from '@playwright/test';

for (const width of [1280, 1024, 390]) {
  test(`configuration cards show additions and gift text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/catalog/barnhouse-57', { waitUntil: 'domcontentloaded' });
    const consent = page.getByRole('button', { name: 'Необходимые', exact: true });
    if (await consent.isVisible()) await consent.click();
    const cards = page.locator('.project-config__tier');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0).locator('.project-config__tier-lead')).toHaveText('Готовый снаружи, ваш замысел внутри.');
    for (let index = 0; index < 3; index++) {
      const card = cards.nth(index);
      await expect(card.locator('.project-config__tier-included')).toHaveCount([4, 2, 4][index]!);
      await expect(card.locator('.project-config__tier-gift')).toHaveCount(1);
      await expect(card.locator('.project-config__tier-gift svg')).toHaveCount(0);
      await expect(card.locator('.project-config__tier-band svg')).toHaveCount(1);
      await expect(card.locator('.project-config__tier-price')).toHaveText(/^от\s+[\d\s]+руб\.$/);
      expect(await card.innerText()).not.toMatch(/[₽—–]|Стоимость/);
      await expect(card.locator('.project-config__tier-price')).toHaveCSS('white-space', 'nowrap');
      expect(await card.locator('.project-config__tier-band').evaluate(element => getComputedStyle(element, '::before').borderTopStyle)).toBe('dashed');
      expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await expect(cards.nth(1).locator('.project-config__tier-includes-title')).toContainText('Дополнительно к Стандартной');
    await expect(cards.nth(2).locator('.project-config__tier-includes-title')).toContainText('Дополнительно к Проектной');
    await cards.nth(2).click();
    await expect(cards.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.project-config__total-label strong')).toHaveText('Под ключ');
    await page.locator('.project-config__tiers').screenshot({ path: `test-results/configuration-cards-${width}.png` });
  });
}
