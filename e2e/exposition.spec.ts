import { expect, test } from '@playwright/test'
import { EXPOSITION_PLACES } from '../src/lib/exposition'

for (const width of [320, 375, 390, 768, 1440]) {
  test(`exposition layout and signup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/exposition')
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Выставочныеплощадки')
    await expect(page.locator('.exposition-hero form')).toHaveCount(0)
    await page.locator('.exposition-hero').getByRole('button', { name: 'Записаться на экскурсию' }).click()
    await expect(page.getByRole('dialog', { name: 'Записаться на экскурсию', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    const photo = page.locator('.exposition-hero img')
    await expect(photo).toBeVisible()
    await expect.poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.getByRole('heading', { level: 1 }).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await expect(page.locator('main a[href="#places"]')).toHaveCount(0)

    for (const place of EXPOSITION_PLACES) {
      const card = page.locator('.exposition-place').filter({ hasText: place.name })
      await expect(card).toHaveAttribute('href', `/exposition/${place.slug}`)
      await expect(card.locator('.independent-review__place')).toHaveText(place.address)
      await expect(card.locator('.series-bento__go')).toBeVisible()
      await expect(card.locator('.series-bento__name')).toHaveText(place.name)
    }
  })
}

test('location selection updates map and project links lead to the catalog', async ({ page }) => {
  await page.goto('/exposition')
  const location = page.getByRole('button', { name: /Высокий Квартал/ })
  await location.click()
  await expect(location).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.exposition-locations iframe')).toHaveAttribute('title', 'Карта: Высокий Квартал')
  await expect(page.locator('.exposition-locations iframe')).toHaveAttribute('src', /output=embed/)
  await expect(page.locator('.exposition-project-card')).toHaveCount(5)
  await page.locator('.exposition-project-card').first().click()
  await expect(page).toHaveURL(/\/catalog\//)
})

for (const place of EXPOSITION_PLACES) {
  for (const width of [320, 375, 390, 768, 1440]) {
  test(`detail template: ${place.slug} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const response = await page.goto(`/exposition/${place.slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(place.name)
    await expect(page.locator('main address')).toHaveText([place.address, place.address])
    await expect(page.locator('main > section')).toHaveCount(5)
    await expect(page.locator('.project-hero h1')).toHaveText(place.name)
    await expect(page.locator('.project-bento > *')).toHaveCount(6)
    await expect(page.locator('.project-plans__body')).toBeVisible()
    await expect(page.locator('.project-rows > *')).toHaveCount(6)
    await expect(page.locator('main a[href^="#"]')).toHaveCount(0)
    await expect(page.locator('main form')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    if (width >= 960) {
      const centerDifference = await page.locator('.exposition-detail-hero__bar').evaluate((bar) => {
        const address = bar.querySelector('address')!.getBoundingClientRect()
        const button = bar.querySelector('button')!.getBoundingClientRect()
        return Math.abs(address.y + address.height / 2 - button.y - button.height / 2)
      })
      expect(centerDifference).toBeLessThan(1)
    }
    expect(await page.locator('.project-hero h1').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
  }
}

test('unknown exhibition site returns 404', async ({ page }) => {
  const response = await page.goto('/exposition/unknown-place')
  expect(response?.status()).toBe(404)
})

test('signup preserves message and identifies source without sending a real lead', async ({ page }) => {
  let payload: Record<string, unknown> | undefined
  await page.route('**/next/leads', async (route) => {
    payload = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/exposition')
  await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
  await page.locator('.exposition-hero').getByRole('button', { name: 'Записаться на экскурсию' }).click()
  const form = page.getByRole('dialog', { name: 'Записаться на экскурсию', exact: true }).locator('form')
  await form.locator('[name="name"]').fill('Тест')
  await form.locator('[name="phone"]').fill('+79991234567')
  await form.locator('[name="message"]').fill('Экскурсия в Авангард')
  await form.locator('[name="consent"]').check()
  await form.getByRole('button', { name: 'Записаться на экскурсию' }).click()
  await expect.poll(() => payload?.message).toBe('Экскурсия в Авангард')
  expect(payload?.pageId).toBe('exposition')
  expect(payload?.meta).toEqual({ requestType: 'exposition-tour' })
})
