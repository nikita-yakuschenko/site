import { test, expect } from '@playwright/test';

test('hero editor retains draft values and changes promo only on selection', async ({ page }) => {
  await page.route('http://localhost:3001/preview-harness', route => route.fulfill({ contentType: 'text/html', body: '<iframe src="http://127.0.0.1:3000/?cmsPreview=1" style="width:1200px;height:900px"></iframe>' }));
  await page.goto('http://localhost:3001/preview-harness');
  const preview = page.frameLocator('iframe');
  const tabs = preview.getByRole('tablist', { name: 'Переключение слайдов' }).first();
  await expect(tabs.getByRole('tab').first()).toBeVisible({ timeout: 30000 });
  const send = (data: unknown) => page.evaluate(data => document.querySelector('iframe')!.contentWindow!.postMessage(data, 'http://127.0.0.1:3000'), data);
  await send({ type: 'avgst:preview-hero-copy', parts: [{ key: 'hero.promo.1', title: 'Несохранённый заголовок', text: 'Новый текст', textMore: '14 ноября', href: 'Записаться' }] });
  await send({ type: 'avgst:preview-promo', index: 1 });
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  const card = preview.locator('[data-cms-block="hero.promo.1"][aria-hidden="false"]');
  await expect(card.locator('strong')).toHaveText('Несохранённый заголовок');
  // A subsequent partial update must not restore saved copy.
  await send({ type: 'avgst:preview-hero-copy', parts: [{ key: 'hero.promo.1', text: 'Ещё правка' }] });
  await expect(card.locator('strong')).toHaveText('Несохранённый заголовок');
  await expect(card).toContainText('Ещё правка');
  await page.waitForTimeout(12_000);
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  await tabs.getByRole('tab').first().click();
  await expect(tabs.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
  await send({ type: 'avgst:preview-promo', index: 1 });
  await expect(tabs.getByRole('tab').nth(1)).toHaveAttribute('aria-selected', 'true');
  await send({ type: 'avgst:preview-hero-copy', parts: [{ key: 'hero.promo.1', title: '', text: '' }] });
  await expect(card.locator('strong')).toBeEmpty();
});

