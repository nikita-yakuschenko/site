import { expect, test, type Page } from '@playwright/test'
import { EXPOSITION_PLACES } from '../src/lib/exposition'

async function installMapProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = { markers: [] as number[][] }
    Object.assign(window, {
      mapProbe: probe,
      ymaps: {
        ready: (callback: () => void) => callback(),
        Map: class {
          behaviors = { disable: () => {} }
          geoObjects = { add: () => {}, getBounds: () => [[56.027318, 43.745222], [56.380221, 43.879414]] }
          container = { fitToViewport: () => {} }
          setBounds() {}
          destroy() {}
        },
        Placemark: class {
          constructor(coordinates: number[]) { probe.markers.push(coordinates) }
        },
      },
    })
  })
}

for (const width of [320, 375, 390, 768, 1440]) {
  test(`exposition layout and signup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/exposition')
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Лучше один раз увидеть')
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
      await expect(card.locator('.independent-review__place')).toHaveText(width < 768 ? place.shortAddress : place.address, { useInnerText: true })
      await expect(card.locator('.series-bento__go')).toBeVisible()
      await expect(card.locator('.series-bento__name')).toHaveText(place.name)
      const bounds = (await card.boundingBox())!
      expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 2)
    }

    if (width < 768) {
      const hero = (await page.locator('.exposition-hero > .section__inner').boundingBox())!
      const photo = (await page.locator('.exposition-visit__photo').boundingBox())!
      const places = (await page.locator('.exposition-places__grid').boundingBox())!
      const mapBlock = (await page.locator('.exposition-locations').boundingBox())!
      expect(hero.x).toBe(24)
      expect(places.x).toBe(hero.x)
      expect(photo.x).toBe(hero.x)
      expect(mapBlock.x).toBe(hero.x)
      const heading = (await page.locator('#visit-title').boundingBox())!
      const benefits = (await page.locator('.exposition-benefits').boundingBox())!
      expect(benefits.y).toBeGreaterThanOrEqual(heading.y + heading.height + 23)
      const items = await page.locator('.exposition-benefits li').evaluateAll((elements) => elements.map((el) => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })))
      expect(new Set(items.map((item) => item.x)).size).toBe(1)
      for (let index = 1; index < items.length; index++) expect(items[index]!.y).toBeGreaterThan(items[index - 1]!.y)
      for (const place of EXPOSITION_PLACES) {
        await page.locator('.exposition-locations').getByRole('tab', { name: place.name, exact: true }).click()
        await expect(page.locator('.exposition-locations .contacts__place-live .contacts__address-title')).toHaveText(place.shortAddress)
        await expect(page.locator('.exposition-locations .contacts__place-live .exposition-locations__full-address')).toHaveText(place.address)
      }
    }
  })
}

test('exhibition tabs switch the address, map and route without moving the panel', async ({ page }) => {
  await installMapProbe(page)
  await page.goto('/exposition')
  await expect(page.locator('.exposition-locations .contacts__map')).toHaveClass(/is-ready/)
  await expect(page.locator('.exposition-locations iframe')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { mapProbe: { markers: number[][] } }).mapProbe.markers)).toEqual([
    [56.027318, 43.879414],
  ])
  const panel = page.locator('.exposition-locations')
  await expect(panel.locator('.contacts__place-live .exposition-locations__stat-value')).toHaveText(['40+', '1', '1'])
  const before = (await panel.boundingBox())!
  const mapBounds = (await panel.locator('.contacts__map').boundingBox())!
  expect(mapBounds.width / mapBounds.height).toBeCloseTo(4 / 3, 2)
  await expect(panel.locator('.exposition-locations__route')).toHaveAttribute('href', 'https://yandex.ru/maps/?rtext=~56.027318,43.879414&rtt=auto')
  await panel.getByRole('tab', { name: 'Высокий Квартал', exact: true }).click()
  await expect(panel.getByRole('tab', { name: 'Высокий Квартал', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(panel.locator('.contacts__place-live .contacts__address-title')).toHaveText('посёлок Высоково')
  await expect(panel.locator('.contacts__place-live .exposition-locations__full-address')).toHaveText('город Нижний Новгород, посёлок Высоково (Сормовский район)')
  await expect(panel.locator('.contacts__place-live .exposition-locations__stat-value')).toHaveText(['2', '2', '2'])
  await expect(panel.locator('.contacts__map')).toHaveClass(/is-ready/)
  expect(await page.evaluate(() => (window as unknown as { mapProbe: { markers: number[][] } }).mapProbe.markers)).toEqual([
    [56.027318, 43.879414], [56.380221, 43.745222],
  ])
  await expect(panel.locator('.exposition-locations__route')).toHaveAttribute('href', 'https://yandex.ru/maps/?rtext=~56.380221,43.745222&rtt=auto')
  const after = (await panel.boundingBox())!
  expect(after.height).toBeCloseTo(before.height, 0)
  await panel.getByRole('tab', { name: 'Высокий Квартал', exact: true }).press('ArrowLeft')
  await expect(panel.getByRole('tab', { name: 'Авангард', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.exposition-projects .card')).toHaveCount(3)
  await expect(page.locator('.exposition-projects .card h3')).toHaveText(['Норвегия 132', 'Барнхаус 90', 'Барнхаус 113'])
  await page.locator('.exposition-projects .card__media').first().click()
  await expect(page).toHaveURL(/\/catalog\//)
})

for (const place of EXPOSITION_PLACES) {
  test(`visit button opens signup and submits the chosen site: ${place.slug}`, async ({ page }) => {
    let payload: Record<string, unknown> | undefined
    await page.route('**/next/leads', async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto('/exposition')
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    await expect(page.locator('#directions-title')).toHaveText('Запишитесь на просмотр домов')
    await page.locator('.exposition-locations').getByRole('tab', { name: place.name, exact: true }).click()
    await page.locator('.exposition-locations').getByRole('button', { name: `Посетить КП ${place.name}`, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: `Экскурсия в ${place.name}`, exact: true })
    await expect(dialog).toBeVisible()
    await dialog.locator('[name="name"]').fill('Тест')
    await dialog.locator('[name="phone"]').fill('+79991234567')
    await dialog.locator('[name="consent"]').check()
    await dialog.getByRole('button', { name: 'Записаться на экскурсию', exact: true }).click()
    await expect.poll(() => payload?.meta).toEqual({ requestType: 'exposition-tour', exposition: place.slug })
    expect(payload?.pageId).toBe('exposition')
  })
}

for (const place of EXPOSITION_PLACES) {
  for (const width of [320, 375, 390, 768, 1440]) {
  test(`detail template: ${place.slug} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const response = await page.goto(`/exposition/${place.slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(place.name)
    await expect(page.locator('main address')).toHaveText([place.address])
    await expect(page.locator('main > section')).toHaveCount(5)
    await expect(page.locator('.exposition-detail-projects + .exposition-visit')).toHaveCount(1)
    await expect(page.locator('.project-hero h1')).toHaveText(place.name)
    await expect(page.getByRole('heading', { name: 'Проекты в экспозиции', exact: true })).toBeVisible()
    if (place.slug === 'vysokiy-kvartal') {
      const projects = page.locator('.exposition-detail-projects')
      await expect(projects.locator('.card')).toHaveCount(2)
      await expect(projects.locator('.card h3')).toHaveText(['Барнхаус 113', 'Барнхаус 90'])
      await expect(projects.locator('.card__cta').nth(0)).toHaveAttribute('href', '/catalog/barnhouse-115')
      await expect(projects.locator('.card__cta').nth(1)).toHaveAttribute('href', '/catalog/barnhouse-90')
      await expect(projects.locator('.exposition-photo-placeholder')).toHaveCount(0)
    } else {
      const projects = page.locator('.exposition-detail-projects')
      await expect(projects.locator('.card')).toHaveCount(1)
      await expect(projects.locator('.card h3')).toHaveText(['Норвегия 132'])
      await expect(projects.locator('.card__cta')).toHaveAttribute('href', '/catalog/norvegiya-132')
      await expect(projects.locator('.exposition-photo-placeholder')).toHaveCount(0)
    }
    await expect(page.locator('.project-plans__body')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Как проходит экскурсия', exact: true })).toBeVisible()
    await expect(page.locator('.exposition-tour-gallery > *')).toHaveCount(6)
    await expect(page.locator('.exposition-tour-gallery > .project-bento__lead')).toHaveCount(1)
    if (place.slug === 'avangard') {
      await expect(page.locator('.exposition-tour-gallery .exposition-photo-placeholder')).toHaveCount(0)
      await expect(page.locator('.exposition-tour-gallery img')).toHaveCount(6)
      await expect(page.locator('.exposition-tour-gallery .project-bento__lead img')).toHaveAttribute('alt', 'Дом с террасой на площадке Авангард')
      await expect(page.locator('.exposition-tour-gallery .project-bento__rest')).toHaveText('+1ещё фото')
    } else {
      await expect(page.locator('.exposition-tour-gallery > .exposition-photo-placeholder')).toHaveCount(6)
    }
    await expect(page.locator('main a[href^="#"]')).toHaveCount(0)
    await expect(page.locator('main form')).toHaveCount(0)
    const locations = page.locator('.exposition-locations')
    await expect(locations.getByRole('tab')).toHaveCount(0)
    await expect(locations.locator('.contacts__address-title')).toHaveText(place.shortAddress)
    await expect(locations.locator('.exposition-locations__full-address')).toHaveText(place.address)
    await expect(locations.locator('.contacts__map')).toBeVisible()
    await expect(locations.getByRole('button', { name: `Посетить КП ${place.name}`, exact: true })).toBeVisible()
    const otherPlace = EXPOSITION_PLACES.find((item) => item.slug !== place.slug)!
    await expect(locations).not.toContainText(otherPlace.name)
    if (width < 768) {
      const panel = (await locations.boundingBox())!
      const map = (await locations.locator('.contacts__map').boundingBox())!
      const button = (await locations.getByRole('button', { name: `Посетить КП ${place.name}`, exact: true }).boundingBox())!
      const route = (await locations.locator('.exposition-locations__route').boundingBox())!
      expect(map.width).toBeCloseTo(panel.width - 32, 1)
      expect(button.width).toBeLessThanOrEqual(panel.width - 32)
      expect(Math.abs(button.x + button.width / 2 - panel.x - panel.width / 2)).toBeLessThan(1)
      expect(Math.abs(route.x + route.width / 2 - panel.x - panel.width / 2)).toBeLessThan(1)
    }
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

for (const place of EXPOSITION_PLACES) {
  test(`detail map and signup are limited to the current site: ${place.slug}`, async ({ page }) => {
    await installMapProbe(page)
    let payload: Record<string, unknown> | undefined
    await page.route('**/next/leads', async (route) => {
      payload = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto(`/exposition/${place.slug}`)
    await page.getByRole('button', { name: 'Необходимые', exact: true }).click()
    const locations = page.locator('.exposition-locations')
    await expect(locations.locator('.contacts__map')).toHaveClass(/is-ready/)
    expect(await page.evaluate(() => (window as unknown as { mapProbe: { markers: number[][] } }).mapProbe.markers)).toEqual([place.coordinates])
    await expect(locations.locator('.exposition-locations__route')).toHaveAttribute('href', `https://yandex.ru/maps/?rtext=~${place.coordinates.join(',')}&rtt=auto`)
    await expect(locations.locator('.exposition-locations__stat-value')).toHaveText([
      place.exposition.presentedProjects, String(place.exposition.accessibleHomes), String(place.exposition.homesForSale),
    ])
    await locations.getByRole('button', { name: `Посетить КП ${place.name}`, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: `Экскурсия в ${place.name}`, exact: true })
    await expect(dialog).toBeVisible()
    await dialog.locator('[name="name"]').fill('Тест')
    await dialog.locator('[name="phone"]').fill('+79991234567')
    await dialog.locator('[name="consent"]').check()
    await dialog.getByRole('button', { name: 'Записаться на экскурсию', exact: true }).click()
    await expect.poll(() => payload?.meta).toEqual({ requestType: 'exposition-tour', exposition: place.slug })
    expect(payload?.pageId).toBe(`exposition/${place.slug}`)
  })
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
