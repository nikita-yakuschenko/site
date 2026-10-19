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
    await expect(cards.nth(1).locator('.project-config__tier-includes-title')).toContainText('Стандартная комплектация дополняется');
    await expect(cards.nth(2).locator('.project-config__tier-includes-title')).toContainText('Проектная комплектация дополняется');
    if (width >= 800) {
      const positions = await cards.evaluateAll(elements => elements.map(card => card.querySelector('.project-config__tier-included')!.getBoundingClientRect().top));
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    }
    await expect(cards.nth(1).locator('.project-config__tier-base')).toHaveCSS('color', 'rgb(72, 176, 98)');
    await cards.nth(2).click();
    await expect(cards.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.project-config__total-label strong')).toHaveText('Под ключ');
    await page.locator('.project-config__tiers').screenshot({ path: `test-results/configuration-cards-${width}.png` });
    if (width === 1280) {
      await page.evaluate(() => document.fonts.ready);
      const closedHeight = (await page.locator('.project-config__tiers').boundingBox())!.height;
      const panel = page.locator('.project-config__total');
      await panel.getByRole('button', { name: 'Получить расчёт', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.project-config__total')!.getAnimations({ subtree: true }).length === 0);
      const openedHeight = (await page.locator('.project-config__tiers').boundingBox())!.height;
      const openedPanelHeight = (await panel.boundingBox())!.height;
      const samples = await page.evaluate(async () => {
        const cards = document.querySelector('.project-config__tiers')!;
        const panel = document.querySelector('.project-config__total')!;
        const heights = [cards.getBoundingClientRect().height];
        const panelHeights = [panel.getBoundingClientRect().height];
        (document.querySelector('.project-config__close') as HTMLButtonElement).click();
        await new Promise<void>(resolve => {
          const start = performance.now();
          const measure = () => {
            heights.push(cards.getBoundingClientRect().height);
            panelHeights.push(panel.getBoundingClientRect().height);
            if (performance.now() - start < 700) requestAnimationFrame(measure);
            else resolve();
          };
          requestAnimationFrame(measure);
        });
        return { heights, panelHeights };
      });
      expect(Math.max(...samples.heights)).toBeLessThanOrEqual(Math.max(closedHeight, openedHeight) + 1);
      expect(Math.min(...samples.heights)).toBeGreaterThanOrEqual(Math.min(closedHeight, openedHeight) - 1);
      expect(samples.heights.at(-1)).toBeCloseTo(closedHeight, 0);
      const finalPanelHeight = samples.panelHeights.at(-1)!;
      const distance = openedPanelHeight - finalPanelHeight;
      expect(distance).toBeGreaterThan(40);
      expect(samples.panelHeights.some(height => height > finalPanelHeight + 2 && height < openedPanelHeight - 2)).toBe(true);
      const steps = samples.panelHeights.slice(1).map((height, index) => Math.abs(height - samples.panelHeights[index]!));
      expect(Math.max(...steps)).toBeLessThan(distance * .4);

    }
  });
}

for (const width of [1280, 390]) {
  test(`panel-house configurations build on the starting tier at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/catalog/a-frame-52', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.project-config__tier');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0).locator('.project-config__tier-name')).toHaveText('Стартовая');
    await expect(cards.nth(0).locator('.project-config__tier-includes-title')).toHaveText('Надёжная основа для вашего дома:');
    await expect(cards.nth(1).locator('.project-config__tier-includes-title')).toHaveText('Стартовая комплектация дополняется:');
    await expect(cards.nth(2).locator('.project-config__tier-includes-title')).toHaveText('Стандартная комплектация дополняется:');
    const texts = await cards.evaluateAll(elements => elements.map(card => card.textContent || ''));
    for (const text of texts) expect(text).not.toMatch(/(?:^|[ (])(в|во|на|с|со|к|ко|о|об|от|до|по|из|у|за|над|под|при|про|для|без|через|и|а|но|не|ни|или) +/i);
    if (width >= 800) {
      const positions = await cards.evaluateAll(elements => elements.map(card => card.querySelector('.project-config__tier-included')!.getBoundingClientRect().top));
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
    }
  });
}
