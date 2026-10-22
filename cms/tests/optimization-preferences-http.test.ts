import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { handlePreferenceRequest, readPreferenceJson, samePreferenceOrigin } from '../../src/lib/optimization/preferences-server'
import { PREFERENCE_COOKIE, signPreferenceIdentity } from '../../src/lib/optimization/preference-identity'
import { CONSENT_VERSION } from '../../src/consent/types'
import { preferenceEndpoints } from '../src/optimization/likes-endpoints'

const secret = 'ao02-http-tests-only-stable-secret-32-chars'
const cookie = (functional = true, signed = true) => [
  `avgst_cookie_consent=${encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: '2026-10-21T00:00:00.000Z', functional, analytics: true }))}`,
  ...(signed ? [`${PREFERENCE_COOKIE}=${signPreferenceIdentity('a'.repeat(32), secret)}`] : []),
].join('; ')
const mutation = () => ({ liked: true, operation_id: randomUUID(), expected_revision: 0, source: 'project_card' })
function request(method = 'PUT', body: unknown = mutation(), cookies = cookie(), origin = 'http://site.test') {
  return new Request('http://site.test/api/projects/AB12CDEF/like', { method, headers: { Origin: origin, Cookie: cookies, 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body) })
}
async function environment(work: () => Promise<void>) {
  const names = ['OPTIMIZATION_ENABLED', 'OPTIMIZATION_PREFERENCES_ENABLED', 'OPTIMIZATION_EVENTS_ENABLED', 'OPTIMIZATION_PREFERENCES_SECRET', 'CMS_SITE_API_KEY', 'CMS_PUBLIC_URL', 'NEXT_PUBLIC_SITE_URL'] as const
  const old = new Map(names.map(k => [k, process.env[k]]))
  Object.assign(process.env, { OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_PREFERENCES_ENABLED: 'true', OPTIMIZATION_EVENTS_ENABLED: 'true', OPTIMIZATION_PREFERENCES_SECRET: secret, CMS_SITE_API_KEY: 'ao02-server-api-test-key-at-least-32-chars', CMS_PUBLIC_URL: 'http://cms.test', NEXT_PUBLIC_SITE_URL: 'http://site.test' })
  try { await work() } finally { for (const key of names) { const value = old.get(key); if (value === undefined) delete process.env[key]; else process.env[key] = value } }
}

test('public preferences fail closed, require functional consent and reject cross-origin writes before upstream', async t => {
  await environment(async () => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Should not call CMS') })
    process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'false'
    assert.equal((await handlePreferenceRequest(request(), 'set', 'AB12CDEF')).status, 503)
    process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'true'
    assert.equal((await handlePreferenceRequest(request('PUT', mutation(), cookie(false)), 'set', 'AB12CDEF')).status, 403)
    assert.equal((await handlePreferenceRequest(request('PUT', mutation(), cookie(), 'http://evil.test'), 'set', 'AB12CDEF')).status, 403)
    assert.equal(calls, 0)
    assert.equal(samePreferenceOrigin(new Request('http://site.test', { headers: { Origin: 'http://site.test', 'Sec-Fetch-Site': 'cross-site' } }), 'http://site.test'), false)
  })
})
test('the first mutation only establishes cookies; GET can bootstrap without consuming the operation', async t => {
  await environment(async () => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ items: [] }) })
    const first = await handlePreferenceRequest(request('PUT', mutation(), cookie(true, false)), 'set', 'AB12CDEF')
    assert.equal(first.status, 428)
    assert.equal(calls, 0)
    assert.match(first.headers.get('set-cookie') ?? '', /avgst_preferences=/)
    assert.match(first.headers.get('set-cookie') ?? '', /HttpOnly/i)
    assert.equal((await handlePreferenceRequest(new Request('http://site.test/api/projects/likes?codes=AB12CDEF', { headers: { Cookie: cookie(true, false) } }), 'batch')).status, 200)
    assert.equal(calls, 1)
  })
})
test('canonical PUT derives identity/region/analytics server-side and preserves CAS/idempotency', async t => {
  await environment(async () => {
    const input = mutation()
    t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      assert.equal(String(url), 'http://cms.test/api/optimization/preferences/set')
      assert.equal(init?.cache, 'no-store')
      const sent = JSON.parse(String(init?.body))
      assert.deepEqual(sent.mutation, input)
      assert.equal(sent.voter_key, `c:${'a'.repeat(32)}`)
      assert.equal(sent.region, 'msk')
      assert.equal(sent.analytics_allowed, true)
      assert.equal(sent.project_code, 'AB12CDEF')
      assert.equal(sent.subject_key, undefined)
      return Response.json({ project_code: 'AB12CDEF', liked: true, likeCount: 3, revision: 1, reconciliation: 'ready' })
    })
    const response = await handlePreferenceRequest(request('PUT', input, `${cookie()}; avgst_region=msk`), 'set', 'AB12CDEF')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.equal(response.headers.get('authorization'), null)
  })
})
test('strict public payloads, oversized chunked bodies and malformed JSON cannot reach CMS', async t => {
  await environment(async () => {
    let calls = 0
    t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('No upstream') })
    for (const extra of [{ subject_key: 'fake' }, { email: 'test@example.invalid' }, { project_id: 1 }]) assert.equal((await handlePreferenceRequest(request('PUT', { ...mutation(), ...extra }), 'set', 'AB12CDEF')).status, 400)
    const body = new Request('http://site.test', { method: 'PUT', headers: { Origin: 'http://site.test', Cookie: cookie() }, body: 'я'.repeat(20_000) })
    assert.equal((await handlePreferenceRequest(body, 'set', 'AB12CDEF')).status, 413)
    await assert.rejects(readPreferenceJson(new Request('http://site.test', { method: 'POST', body: '{' })), /bad_json/)
    assert.equal(calls, 0)
  })
})
test('CMS endpoints authenticate before flags/database access and reject malformed contracts', async () => {
  await environment(async () => {
    const handler = preferenceEndpoints.find(e => e.path.endsWith('/set'))!.handler
    const fake = (body: unknown, authorized = true) => ({ headers: new Headers({ Authorization: authorized ? `Bearer ${process.env.CMS_SITE_API_KEY}` : 'Bearer wrong' }), json: async () => body, payload: {} }) as unknown as PayloadRequest
    assert.equal((await handler(fake({}, false))).status, 401)
    process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'false'
    assert.equal((await handler(fake({}))).status, 503)
    process.env.OPTIMIZATION_PREFERENCES_ENABLED = 'true'
    assert.equal((await handler(fake({ project_code: 'AB12CDEF', mutation: mutation(), voter_key: `c:${'a'.repeat(32)}`, region: 'nn', analytics_allowed: true, extra: 'rejected' }))).status, 400)
    assert.equal((await handler({ ...fake({}), json: async () => { throw new Error('Malformed') } } as unknown as PayloadRequest)).status, 400)
  })
})
