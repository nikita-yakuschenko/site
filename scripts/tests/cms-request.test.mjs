import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { CMSUnavailableError, decodeCatalog, decodeObject, requestCMSJSON, routeTemplate } from '../../src/server/cms-request.ts'

async function server(t, handler) {
  const app = http.createServer(handler)
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve))
  t.after(() => { app.closeAllConnections(); return new Promise(resolve => app.close(resolve)) })
  return `http://127.0.0.1:${app.address().port}`
}

function logs(t) {
  const records = []
  const warn = console.warn, info = console.info
  console.warn = console.info = value => records.push(value)
  t.after(() => { console.warn = warn; console.info = info })
  return records
}

test('successful empty catalog is data, with bounded structured timing and no payload in logs', async t => {
  const records = logs(t), previous = process.env.CMS_REQUEST_LOGS
  process.env.CMS_REQUEST_LOGS = 'all'
  t.after(() => { if (previous === undefined) delete process.env.CMS_REQUEST_LOGS; else process.env.CMS_REQUEST_LOGS = previous })
  const origin = await server(t, (_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end('{"items":[],"private":"never-log-this"}') })
  const value = await requestCMSJSON('catalog', origin + '/catalog?token=never-log-this', { next: { revalidate: 60 }, headers: { Authorization: 'Bearer never-log-this' } }, data => decodeObject(data).items, { route: '/catalog/private-slug?email=private', requestId: 'malicious\nnever-log-this' })
  assert.deepEqual(value, [])
  assert.equal(records.length, 1)
  const event = JSON.parse(records[0])
  assert.equal(event.outcome, 'ok')
  assert.equal(event.cachePolicy, 60)
  assert.equal(event.route, '/catalog/[slug]')
  assert.match(event.requestId, /^[a-f0-9-]{36}$/)
  assert.ok(event.durationMs >= 0)
  assert.ok(!records.join('').includes('never-log-this'))
  assert.ok(!records.join('').includes('private-slug'))
})

for (const status of [401, 503]) test(`HTTP ${status} cannot become an empty successful catalog`, async t => {
  const records = logs(t)
  const origin = await server(t, (_req, res) => { res.writeHead(status); res.end('secret-upstream-body') })
  await assert.rejects(requestCMSJSON('catalog', origin, {}, decodeObject), error => error instanceof CMSUnavailableError && error.reason === 'http' && error.upstreamStatus === status && !error.message.includes('secret'))
  assert.equal(JSON.parse(records[0]).outcome, 'http')
  assert.ok(!records.join('').includes('secret-upstream-body'))
})

test('invalid JSON and a missing items array are invalid responses, not empty data', async t => {
  logs(t)
  const origin = await server(t, (req, res) => res.end(req.url === '/json' ? 'sensitive-invalid-json' : '{"other":[]}'))
  for (const endpoint of ['/json', '/shape']) await assert.rejects(requestCMSJSON('catalog', origin + endpoint, {}, data => {
    const value = decodeObject(data)
    if (!Array.isArray(value.items)) throw new Error('Invalid catalog')
    return value.items
  }), error => error instanceof CMSUnavailableError && error.reason === 'invalid-response')
})

test('invalid catalog records cannot escape validation into the root shell', () => {
  assert.deepEqual(decodeCatalog({ items: [] }), [])
  for (const items of [[null], [{}], [{ id: 'incomplete' }]]) assert.throws(() => decodeCatalog({ items }))
})

test('timeouts are classified without exposing the fetch error or URL', async t => {
  const records = logs(t)
  const origin = await server(t, () => {})
  await assert.rejects(requestCMSJSON('catalog', origin, { signal: AbortSignal.timeout(30) }, decodeObject), error => error instanceof CMSUnavailableError && error.reason === 'timeout')
  assert.equal(JSON.parse(records[0]).outcome, 'timeout')
  assert.ok(!records.join('').includes(origin))
})

test('Next control flow is rethrown unchanged and not logged as an upstream success or failure', async t => {
  const records = logs(t), original = globalThis.fetch, control = new Error('framework-control')
  globalThis.fetch = async () => { throw control }
  t.after(() => { globalThis.fetch = original })
  await assert.rejects(requestCMSJSON('catalog', 'http://localhost', {}, decodeObject, { rethrow(error) { if (error === control) throw error } }), error => error === control)
  assert.deepEqual(records, [])
})

test('arbitrary network exceptions do not cross the safe error/log boundary', async t => {
  const records = logs(t), original = globalThis.fetch
  globalThis.fetch = async () => { throw new Error('Authorization=super-private-token') }
  t.after(() => { globalThis.fetch = original })
  await assert.rejects(requestCMSJSON('content', 'http://localhost', {}, decodeObject), error => error instanceof CMSUnavailableError && error.reason === 'network' && !error.message.includes('super-private-token'))
  assert.ok(!records.join('').includes('super-private-token'))
  assert.equal(routeTemplate('/secret-user-path?name=test'), '/other')
})
