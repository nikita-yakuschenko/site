import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { listenOptimizationHTTP as listen } from '../tests/support/optimization-http'
import { chromium, type BrowserContext } from '@playwright/test'
import { getPayload, handleEndpoints } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { captureLikeBaseline, type PreferenceDatabase } from '../src/optimization/likes'
import { handlePreferenceRequest } from '../../src/lib/optimization/preferences-server'
import { ProjectPreferencesStore } from '../../src/lib/project-preferences'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../../src/consent/types'
import { PREFERENCE_COOKIE, PREFERENCE_VOTER_COOKIE } from '../../src/lib/optimization/preference-identity'

const target = process.env.OPTIMIZATION_RETURN_TEST_DATABASE_URL
test('new browser restores confirmed server preferences after all session cookies and localStorage disappear', { skip: !target }, async () => {
  const url = new URL(target!)
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname))
  assert.equal(url.pathname, '/ao_test_release')
  const previous = { ...process.env }
  Object.assign(process.env, { DATABASE_URL: target, PAYLOAD_SECRET: 'ao04-disposable-payload-integration-secret-32-chars', CMS_PUBLIC_URL: 'http://127.0.0.1:3001', CMS_SEED: '0', PAYLOAD_DB_PUSH: 'false', NEXT_PHASE: 'phase-production-build', CMS_SITE_API_KEY: 'ao04-disposable-site-api-key-at-least-32-chars', OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_PREFERENCES_ENABLED: 'true', OPTIMIZATION_PREFERENCES_SECRET: 'ao04-disposable-preferences-secret-at-least-32-chars' })
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const db = (payload.db as unknown as { drizzle: PreferenceDatabase }).drizzle
  let id: number | undefined
  let browser = await chromium.launch()
  const cms = await listen(request => handleEndpoints({ config, request }))
  process.env.CMS_PUBLIC_URL = cms.origin
  let imports = 0
  const site = await listen(async request => {
    const path = new URL(request.url).pathname
    if (path.endsWith('/sync')) imports++
    if (path === '/api/projects/likes/list') return handlePreferenceRequest(request, 'list')
    if (path === '/api/projects/likes') return handlePreferenceRequest(request, 'batch')
    if (path === '/api/projects/likes/sync') return handlePreferenceRequest(request, 'sync')
    if (/^\/api\/projects\/[A-Z0-9]{8}\/like$/.test(path)) return handlePreferenceRequest(request, 'set', path.split('/')[3])
    return new Response('not found', { status: 404 })
  })
  process.env.NEXT_PUBLIC_SITE_URL = site.origin
  const stores: ProjectPreferencesStore[] = []
  const requests: { path: string; body?: string }[] = []
  function storeFor(context: BrowserContext) {
    const store = new ProjectPreferencesStore({ uuid: randomUUID, storage: () => undefined, fetch: (async (path: string, init?: RequestInit) => {
      requests.push({ path, body: init?.body as string | undefined })
      const response = await context.request.fetch(`${site.origin}${path}`, { method: init?.method ?? 'GET', headers: { Origin: site.origin, 'Content-Type': 'application/json' }, ...(init?.body ? { data: init.body } : {}) })
      return new Response(await response.body(), { status: response.status(), headers: { 'Content-Type': 'application/json' } })
    }) as typeof fetch })
    stores.push(store); return store
  }
  async function until(check: () => boolean) { for (let i = 0; i < 300; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 20)) } assert.fail('real backend state did not settle') }
  try {
    const project = await payload.create({ collection: 'projects', overrideAccess: true, data: { name: 'AO04 synthetic return test', slug: `return-${randomUUID()}`, recordType: 'project', technologyBadge: 'Панельно-каркасный', areaValue: 80, floorsValue: 1, bedrooms: 2, bathrooms: 1, _status: 'published' } })
    id = project.id
    const code = project.code!
    await captureLikeBaseline(db, code, 'synthetic-return-v1')
    const context = await browser.newContext()
    assert.deepEqual(await context.cookies(), [])
    assert.deepEqual((await context.storageState()).origins, [])
    await context.addCookies([{ name: CONSENT_COOKIE, value: encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: true, analytics: false, marketing: false })), url: site.origin, expires: Date.now() / 1000 + 365 * 86400 }])
    const first = storeFor(context)
    first.register(code); first.setActive(true)
    await until(() => first.view(code).count === 0)
    first.setLiked(code, true, 'project_card')
    await until(() => !first.view(code).pending && first.view(code).count === 1)
    assert.equal(first.view(code).error, false)
    const before = await context.cookies()
    const signed = before.find(cookie => cookie.name === PREFERENCE_COOKIE)!
    const persistent = before.find(cookie => cookie.name === PREFERENCE_VOTER_COOKIE)!
    assert.equal(signed.expires, -1, 'signed cookie is session-only')
    assert.match(persistent.value, /^[a-f0-9]{32}$/)
    assert.ok(persistent.httpOnly && persistent.sameSite === 'Lax')
    assert.ok(Math.abs(persistent.expires - Date.now() / 1000 - 365 * 86400) < 10)
    const severalDaysLater = Date.now() / 1000 + 4 * 86400
    const retained = before.filter(cookie => cookie.expires > severalDaysLater)
    assert.ok(!retained.some(cookie => cookie.name === PREFERENCE_COOKIE))
    assert.ok(retained.some(cookie => cookie.name === PREFERENCE_VOTER_COOKIE))
    const mutation = requests.find(request => request.path.endsWith('/like'))!
    first.setActive(false)
    await browser.close() // Not just a page navigation: no session cookies survive this reconstruction.
    browser = await chromium.launch()
    const returned = await browser.newContext({ storageState: { cookies: retained, origins: [] } })
    const restored = storeFor(returned)
    restored.register(code); restored.setActive(true)
    await until(() => restored.view(code).liked && restored.view(code).count === 1)
    assert.deepEqual(restored.favorites(), [code])
    assert.equal(imports, 0, 'no legacy localStorage exists in either browser')
    const after = await returned.cookies()
    assert.equal(after.find(cookie => cookie.name === PREFERENCE_VOTER_COOKIE)!.value, persistent.value)
    assert.equal(after.find(cookie => cookie.name === PREFERENCE_COOKIE)!.value.split('.')[0], persistent.value)
    const replay = await returned.request.put(`${site.origin}${mutation.path}`, { headers: { Origin: site.origin, 'Content-Type': 'application/json' }, data: mutation.body })
    assert.equal(replay.status(), 200)
    assert.equal((await replay.json()).likeCount, 1)
    const rows = (await db.execute(sql`SELECT subject_key,liked,revision FROM project_likes WHERE project_id=${id}`)).rows
    assert.equal(rows.length, 1); assert.equal(rows[0].liked, true); assert.equal(rows[0].revision, 1)
    assert.equal(Number((await db.execute(sql`SELECT like_count FROM projects WHERE id=${id}`)).rows[0].like_count), 1)
    assert.equal(Number((await db.execute(sql`SELECT count(*) AS n FROM optimization_events WHERE project_id=${id}`)).rows[0].n), 0, 'functional-only consent creates no analytics event')
    console.info('Return proof: persistent avgst_voter, 31536000 seconds, same canonical subject, one row, count=1, no import; all session cookies removed and browser relaunched.')
  } finally {
    for (const store of stores) store.setActive(false)
    await browser.close(); await site.close(); await cms.close()
    if (id) await payload.delete({ collection: 'projects', id, overrideAccess: true })
    await payload.destroy()
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key]
    Object.assign(process.env, previous)
  }
})
