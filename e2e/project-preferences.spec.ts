import { test, expect, type BrowserContext } from '@playwright/test'
import { CONSENT_VERSION } from '../src/consent/types'

const code = 'ABCDEF12'
const second = 'GHIJKL34'
async function setup(context: BrowserContext, functional = true) {
  await context.addCookies([{ name: 'avgst_cookie_consent', value: encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional, analytics: false, marketing: false })), url: 'http://localhost:3014' }])
  const states = new Map([code, second].map(project_code => [project_code, { project_code, liked: false, likeCount: 8, revision: 0, reconciliation: 'ready' }]))
  const writes: Record<string, unknown>[] = []
  const imports: Record<string, unknown>[] = []
  let failWrites = false
  let conflict = false
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort()
    if (!url.pathname.startsWith('/api/projects/')) return route.continue()
    if (url.pathname === '/api/projects/likes/list') return route.fulfill({ json: { items: [...states.values()].filter(s => s.liked), next_cursor: null } })
    if (url.pathname === '/api/projects/likes') return route.fulfill({ json: { items: (url.searchParams.get('codes') ?? '').split(',').map(c => states.get(c)).filter(Boolean) } })
    if (url.pathname === '/api/projects/likes/sync') {
      const body = route.request().postDataJSON(); imports.push(body)
      const state = states.get(code)!; state.liked = true; state.revision++
      return route.fulfill({ json: { completed: true, items: body.legacy_ids.map((legacy_id: string) => ({ legacy_id, result: 'synced', state })) } })
    }
    if (url.pathname.endsWith('/like')) {
      const body = route.request().postDataJSON(); writes.push(body)
      if (failWrites) return route.abort()
      const state = states.get(url.pathname.split('/')[3]!)!
      if (conflict) { conflict = false; state.revision++ }
      if (body.expected_revision !== state.revision) return route.fulfill({ status: 409, json: { error: 'stale_revision', current: state } })
      state.likeCount += body.liked === state.liked ? 0 : body.liked ? 1 : -1
      state.liked = body.liked; state.revision++
      return route.fulfill({ json: state })
    }
    return route.continue()
  })
  return { writes, imports, fail: (value: boolean) => { failWrites = value }, conflict: () => { conflict = true } }
}

test('card, detail page, two tabs and catalog filter use the same heart state', async ({ context, page }) => {
  const server = await setup(context)
  await page.goto('/catalog')
  const card = page.locator('.card').filter({ hasText: 'Тестовый дом 1' })
  const heart = card.getByRole('button', { name: 'В избранное', exact: true })
  await expect(heart).toBeVisible()
  await heart.click()
  await expect(card.getByRole('button', { name: 'Убрать из избранного' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => server.writes.length).toBe(1)
  const detail = await context.newPage()
  await detail.goto('/catalog/ao03-house-0')
  const action = detail.locator('.project-actions').getByRole('button', { name: 'Убрать из избранного' })
  await expect(action).toHaveAttribute('aria-pressed', 'true')
  await expect(action).toHaveText('9')
  server.conflict()
  await action.click()
  await expect(detail.locator('.project-actions').getByRole('button', { name: 'В избранное' })).toHaveText('8')
  await expect(card.getByRole('button', { name: 'В избранное' })).toHaveAttribute('aria-pressed', 'false')
  await card.getByRole('button', { name: 'В избранное' }).click()
  await page.getByRole('button', { name: /Только избранное/ }).click()
  await expect(page.locator('.card')).toHaveCount(1)
  await expect(page.locator('.card')).toContainText('Тестовый дом 1')
})

test('legacy import is acknowledged before removal and does not send a fresh like', async ({ context, page }) => {
  const server = await setup(context)
  await context.addInitScript(() => { if (!sessionStorage.getItem('ao03-seeded')) { localStorage.setItem('avgst:favorites', JSON.stringify(['legacy-house-0'])); sessionStorage.setItem('ao03-seeded', '1') } })
  await page.goto('/catalog')
  const card = page.locator('.card').filter({ hasText: 'Тестовый дом 1' })
  await expect(card.getByRole('button', { name: 'Убрать из избранного' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => server.imports.length).toBe(1)
  expect(server.writes).toHaveLength(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('avgst:favorites')!))).toEqual([])
  await page.reload()
  await expect(card.getByRole('button', { name: 'Убрать из избранного' })).toHaveAttribute('aria-pressed', 'true')
  expect(server.imports).toHaveLength(1)
})

test('failed write keeps the optimistic choice and offers an idempotent retry', async ({ context, page }) => {
  const server = await setup(context); server.fail(true)
  await page.goto('/catalog')
  const card = page.locator('.card').filter({ hasText: 'Тестовый дом 1' })
  await card.getByRole('button', { name: 'В избранное' }).click()
  const retry = card.getByRole('button', { name: 'Повторить сохранение избранного' })
  await expect(retry).toBeVisible()
  await expect(card.getByRole('button', { name: 'Убрать из избранного' })).toHaveAttribute('aria-pressed', 'true')
  server.fail(false)
  await retry.click()
  await expect(retry).toHaveCount(0)
  expect(server.writes[0]!.operation_id).toBe(server.writes[1]!.operation_id)
})

test('blocked localStorage still supports hearts and shared counts', async ({ context, page }) => {
  const server = await setup(context)
  await context.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }) })
  await page.goto('/catalog/ao03-house-0')
  await page.locator('.project-actions').getByRole('button', { name: 'В избранное' }).click()
  await expect(page.locator('.project-actions').getByRole('button', { name: 'Убрать из избранного' })).toHaveText('9')
  await expect.poll(() => server.writes.length).toBe(1)
})

test('no functional consent means no bootstrap or writes; server revocation clears HttpOnly identifiers', async ({ context, page }) => {
  const server = await setup(context, false)
  await context.addCookies(['avgst_preferences', 'avgst_voter'].map(name => ({ name, value: 'synthetic', httpOnly: true, url: 'http://localhost:3014' })))
  let reads = 0
  page.on('request', request => { if (request.url().includes('/api/projects/likes')) reads++ })
  await page.goto('/catalog')
  await page.locator('.card').filter({ hasText: 'Тестовый дом 1' }).getByRole('button', { name: 'В избранное' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(server.writes).toHaveLength(0)
  expect(reads).toBe(0)
  const response = await context.request.post('/api/consent', { headers: { Origin: 'http://localhost:3014' }, data: { action: 'revoke_optional', functional: false, analytics: false, marketing: false } })
  expect(response.ok()).toBeTruthy()
  expect((await context.cookies()).filter(cookie => ['avgst_preferences', 'avgst_voter'].includes(cookie.name))).toHaveLength(0)
})
