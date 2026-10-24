import { expect, test } from '@playwright/test'
import { diagnose, beginNavigation } from './probe'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../src/consent/types'

async function browserConsent(page: Parameters<typeof diagnose>[0], baseURL: string, functional: boolean) {
  await page.context().addCookies([{
    name: CONSENT_COOKIE,
    value: encodeURIComponent(JSON.stringify({
      version: CONSENT_VERSION, decidedAt: new Date().toISOString(),
      necessary: true, functional, analytics: false, marketing: false,
    })),
    url: baseURL,
  }])
}
const functionalConsent = (page: Parameters<typeof diagnose>[0], baseURL: string) => browserConsent(page, baseURL, true)

async function applicationReady(page: Parameters<typeof diagnose>[0]) {
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', 'true')
}

async function reload(page: Parameters<typeof diagnose>[0]) {
  beginNavigation(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await applicationReady(page)
}

async function open(page: Parameters<typeof diagnose>[0], path: string) {
  beginNavigation(page)
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
  expect(response?.status(), path).toBeLessThan(400)
  expect(new URL(page.url()).origin, 'Scenario must remain on its target origin').toBe(new URL(String(test.info().project.use.baseURL)).origin)
  await applicationReady(page)
}

async function publishedProjects(page: Parameters<typeof diagnose>[0]) {
  await open(page, '/catalog')
  await expect(page.locator('.card__media').first()).toBeVisible()
  return page.locator('.card__media').evaluateAll(links => {
    const selected = new Map<string, string>()
    for (const link of links) {
      const badge = link.querySelector('.badge')?.textContent?.trim() || 'other'
      const href = (link as HTMLAnchorElement).getAttribute('href') || ''
      if (/^\/catalog\/[a-z0-9-]+$/.test(href) && !selected.has(badge)) selected.set(badge, href)
    }
    return [...selected.values()].slice(0, 3)
  })
}

test('home direct, reload and repeat navigation @critical', async ({ page }, info) => diagnose(page, info, 'home direct, reload and repeat navigation', async () => {
  await open(page, '/')
  await reload(page)
  await open(page, '/catalog')
  await open(page, '/')
}))

test('catalog and published technologies @critical', async ({ page }, info) => diagnose(page, info, 'catalog and published technologies', async () => {
  const projects = await publishedProjects(page)
  expect(projects.length, 'Published project links are required for this diagnostic').toBeGreaterThan(0)
  for (const href of projects) {
    await open(page, href)
    await expect(page.locator('h1').first()).toBeVisible()
    await reload(page)
  }
}))

test('catalog filters and favorites @critical', async ({ page }, info) => diagnose(page, info, 'catalog filters and favorites', async () => {
  await functionalConsent(page, String(info.project.use.baseURL))
  await open(page, '/catalog')
  const href = await page.locator('.card__media').first().getAttribute('href')
  expect(href).toBeTruthy()
  const favorite = page.locator('.card').filter({ has: page.locator(`.card__media[href="${href}"]`) }).locator('.icon-btn[aria-pressed]')
  await expect(favorite).toBeVisible()
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  if (info.project.name.includes('mobile')) await page.getByRole('button', { name: /^Фильтрация/ }).click()
  await page.getByRole('button', { name: /Только избранное/ }).click()
  if (info.project.name.includes('mobile')) await page.locator('.catalog-filter-popover .cfilter__apply').click()
  await expect(page.locator('.card').first()).toBeVisible()
  if (info.project.name.includes('mobile')) {
    await page.getByRole('button', { name: /^Фильтрация/ }).click()
    await page.getByRole('button', { name: 'Сбросить всё', exact: true }).click()
  }
  const ready = page.getByRole('checkbox', { name: 'Готовый дом в продаже' })
  if (await ready.isVisible()) {
    await ready.click()
    await expect(page).toHaveURL(/status=ready/)
  }
}))

test('region change and project prices @critical', async ({ page }, info) => diagnose(page, info, 'region change and project prices', async () => {
  await functionalConsent(page, String(info.project.use.baseURL))
  const projects = await publishedProjects(page)
  expect(projects.length).toBeGreaterThan(0)
  const fixture = process.env.DIAG_TARGET !== 'production'
  await open(page, fixture ? '/catalog/barhhouse-73' : projects[0]!)
  await expect(page.locator('.project-config')).toBeVisible()
  const before = await page.locator('.project-config').innerText()
  const total = page.locator('.project-config__total-sum').first()
  if (fixture) await expect(total).toHaveText(/2\s000\s000/)
  await page.locator('.site-region__trigger').click()
  await page.getByRole('option', { name: /Московская область/ }).click()
  await expect(page.locator('.site-region__label')).toHaveText('Московская область')
  await expect.poll(() => page.locator('.project-config').innerText()).not.toBe(before)
  if (fixture) await expect(total).toHaveText(/2\s500\s000/)
}))

test('form open, client validation and invisible captcha @critical', async ({ page }, info) => diagnose(page, info, 'form open, client validation and invisible captcha', async () => {
  await browserConsent(page, String(info.project.use.baseURL), false)
  await open(page, '/')
  if (info.project.name.includes('mobile')) {
    await page.locator('.site-header__burger').click()
    await page.locator('.site-menu__ask').click()
  } else {
    await page.locator('.site-header__cta').click()
  }
  const dialog = page.getByRole('dialog', { name: 'Задать вопрос' })
  await expect(dialog).toBeVisible()
  const form = dialog.locator('form')
  await expect(form).toBeVisible()
  const config = await page.request.get('/api/smartcaptcha-config')
  expect(config.ok(), 'Invisible SmartCaptcha runtime configuration').toBeTruthy()
  expect((await config.json()).configured).toBe(true)
  await expect.poll(() => page.evaluate(() => typeof (window as Window & { smartCaptcha?: { render?: unknown } }).smartCaptcha?.render), {
    message: 'SmartCaptcha browser API must finish initialization',
  }).toBe('function')
  // Invalid fields prevent the captcha challenge and any lead submission.
  await form.locator('button[type=submit]').click()
  await expect(form.locator('input[name=name]')).toHaveAttribute('aria-invalid', 'true')
  await dialog.getByRole('button', { name: /Закрыть/ }).first().click()
  await expect(dialog).toBeHidden()
}))

test('mobile menu and state variants', async ({ page, context }, info) => diagnose(page, info, 'mobile menu and state variants', async () => {
  await page.addInitScript(() => localStorage.setItem('avgst:tech-bar-theme', 'dark'))
  await open(page, '/')
  if (info.project.name.includes('mobile')) {
    const burger = page.locator('.site-header__burger')
    await burger.click()
    await expect(page.locator('.site-menu__panel')).toBeVisible()
    beginNavigation(page)
    await page.locator('.site-menu__panel nav a[href="/"]').first().click()
    await expect(page.locator('.site-menu__panel')).toBeHidden()
  }
  await context.clearCookies()
  await reload(page)
}))
