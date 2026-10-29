import { test, expect, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('avgst:cookie-notice-dismissed', '1'))
  await page.route(/(?:mc\.yandex\.ru|roistat\.com|one2click\.ru|top-fwz1\.mail\.ru|smartcaptcha\.yandexcloud\.net)/, route => route.abort())
  await page.route('**/next/leads', route => route.abort())
})

async function noKeyboardFocus(page: Page) {
  expect(await page.evaluate(() => document.activeElement?.matches('input:not([type="checkbox"]),textarea,[contenteditable="true"]'))).toBe(false)
}

for (const scenario of ['visible', 'overflow', 'tall'] as const) test(`mortgage reveal: ${scenario}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: scenario === 'tall' ? 360 : 1000 })
  await page.goto('/catalog/barnhouse-76', { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: ':root{--form-safe-top:40px;--form-safe-bottom:24px}' })
  const panel = page.locator('.mortgage-calc .panel-lead').last()
  await panel.waitFor()
  const button = panel.locator('button[aria-expanded="false"]').first()
  await button.scrollIntoViewIfNeeded()
  await panel.evaluate((node, scenario) => window.scrollBy(0, node.getBoundingClientRect().top - (scenario === 'visible' ? 300 : window.innerHeight - 120)), scenario)
  const before = await page.evaluate(() => scrollY)
  // Keep the starting position: Playwright's click would center an offscreen trigger itself.
  await button.evaluate(node => (node as HTMLButtonElement).click())
  await page.waitForTimeout(1100)
  await noKeyboardFocus(page)
  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  if (scenario === 'tall') expect(box!.y).toBeCloseTo(56, 0)
  else {
    expect(box!.y).toBeGreaterThanOrEqual(55)
    expect(box!.y + box!.height).toBeLessThanOrEqual(961)
    if (scenario === 'visible') expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(2)
  }
  await page.screenshot({ path: `output/mobile-form-${scenario}.png` })
})

test('manual gesture cancels automatic positioning', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await page.goto('/catalog/barnhouse-76')
  const panel = page.locator('.mortgage-calc .panel-lead').last()
  await panel.locator('button[aria-expanded="false"]').first().evaluate(node => (node as HTMLButtonElement).click())
  await page.waitForTimeout(100)
  await page.evaluate(() => { window.dispatchEvent(new Event('touchstart')); window.scrollTo(0, 200) })
  await page.waitForTimeout(1100)
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(200, 0)
})

for (const route of ['/', '/family-mortgage', '/manufacture', '/business']) test(`mobile dialog and inline forms on ${route}`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 })
  await page.goto(route)
  const dialogButton = page.locator('.site-header__cta').first()
  if (await dialogButton.count()) {
    await dialogButton.evaluate(node => (node as HTMLButtonElement).click())
    await expect(page.locator('.ask-dialog')).toBeVisible()
    await noKeyboardFocus(page)
    await page.keyboard.press('Shift+Tab')
    expect(await page.locator('.ask-dialog').evaluate(node => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Tab')
    await expect(page.locator('.ask-dialog__close')).toBeFocused()
    const box = await page.locator('.ask-dialog__card').boundingBox()
    expect(box!.y).toBeGreaterThanOrEqual(15)
    expect(box!.y + box!.height).toBeLessThanOrEqual(705)
    await page.locator('.ask-dialog__close').click()
  }
  const triggers = page.locator('.lead-reveal__copy button, .referral__open')
  const count = await triggers.count()
  for (let index = 0; index < count; index++) {
    await triggers.nth(index).evaluate(node => (node as HTMLButtonElement).click())
    await page.waitForTimeout(1100)
    await noKeyboardFocus(page)
    const close = page.locator('.lead-reveal.is-open .lead-reveal__close, .referral__panel.is-open .referral__close').first()
    if (await close.isVisible()) await close.click()
  }
})

test('mobile configuration and native event dialog do not focus an input', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 660 })
  await page.goto('/catalog/barnhouse-76')
  await page.locator('.project-config__mobile-quote').first().click()
  await page.waitForTimeout(1100)
  await noKeyboardFocus(page)
  const card = await page.locator('.project-config__tier-card[data-form="true"]').boundingBox()
  expect(card!.y).toBeGreaterThanOrEqual(15)
  await page.goto('/factory-open-day')
  await page.locator('.ags-hero__act button').first().click()
  await expect(page.locator('dialog[open]')).toBeVisible()
  await noKeyboardFocus(page)
})

test('desktop panel does not run the mobile controller', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/catalog/barnhouse-76')
  const panel = page.locator('.mortgage-calc .panel-lead').last()
  await panel.locator('button[aria-expanded="false"]').first().evaluate(node => (node as HTMLButtonElement).click())
  await expect(panel.locator('.panel-lead__form')).toHaveAttribute('data-open', 'true')
  await expect(panel.locator('input[name="name"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.style.overflowAnchor)).not.toBe('none')
  if (browserName === 'chromium') await expect(panel.locator('input[name="name"]')).toBeFocused()
  await panel.locator('input[name="name"]').focus()
  await expect(panel.locator('input[name="name"]')).toBeFocused()
})

test('reduced motion finishes positioning without enabling input focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto('/catalog/barnhouse-76')
  const panel = page.locator('.mortgage-calc .panel-lead').last()
  await panel.locator('button[aria-expanded="false"]').first().click()
  await page.waitForTimeout(1100)
  await noKeyboardFocus(page)
  expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(15)
})



