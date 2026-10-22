import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { proxy } from '../../src/proxy'
import { prepareOptimizationProxy, readOptimizationSSRContext, OPTIMIZATION_CONTEXT_HEADER, OPTIMIZATION_PREFETCH_HEADER, OPTIMIZATION_CONTEXT_COOKIE } from '../../src/lib/optimization/server-context'
const secret = 'ao04-unit-context-secret-at-least-32-characters'

test('Proxy header/cookie match even with CMS outage; forged headers are removed and first requests remain self-consistent', async () => {
  const before = { ...process.env }, originalFetch = globalThis.fetch
  Object.assign(process.env, { OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_RANKING_ENABLED: 'true', OPTIMIZATION_CONTEXT_SECRET: secret })
  globalThis.fetch = async () => { throw new Error('synthetic CMS outage') }
  try {
    const headers = { [OPTIMIZATION_CONTEXT_HEADER]: 'forged', [OPTIMIZATION_PREFETCH_HEADER]: 'forged', 'x-avgst-region': 'forged' }
    const responses = await Promise.all([proxy(new NextRequest('http://localhost/first-one', { headers })), proxy(new NextRequest('http://localhost/first-two', { headers }))])
    const tokens = responses.map(response => response.cookies.get(OPTIMIZATION_CONTEXT_COOKIE)!.value)
    assert.notEqual(tokens[0], tokens[1], 'first requests without a shared cookie cannot be merged')
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]!
      assert.equal(response.headers.get(`x-middleware-request-${OPTIMIZATION_CONTEXT_HEADER}`), tokens[i])
      assert.equal(response.headers.get('x-middleware-request-x-avgst-region'), 'nn')
      assert.equal(response.cookies.get(OPTIMIZATION_CONTEXT_COOKIE)!.httpOnly, true)
      assert.equal(response.cookies.get(OPTIMIZATION_CONTEXT_COOKIE)!.maxAge, undefined)
      assert.match(response.headers.get('cache-control')!, /private, no-store/)
    }
    const existing = await proxy(new NextRequest('http://localhost/again', { headers: { ...headers, cookie: `${OPTIMIZATION_CONTEXT_COOKIE}=${tokens[1]}` } }))
    assert.equal(existing.cookies.get(OPTIMIZATION_CONTEXT_COOKIE)!.value, tokens[1])
    const incoming = new Headers({ cookie: `${OPTIMIZATION_CONTEXT_COOKIE}=${tokens[1]}`, ...headers })
    const forwarded = new Headers(incoming)
    prepareOptimizationProxy({ headers: incoming }, forwarded)
    assert.equal(readOptimizationSSRContext(forwarded)!.token, tokens[1])
    const speculative = new Headers({ 'next-router-prefetch': '1', ...headers })
    assert.equal(prepareOptimizationProxy({ headers: speculative }, speculative), null)
    assert.equal(speculative.has(OPTIMIZATION_CONTEXT_HEADER), false)
    assert.equal(speculative.get(OPTIMIZATION_PREFETCH_HEADER), '1')
    process.env.OPTIMIZATION_ENABLED = 'false'
    const disabled = new Headers(headers)
    assert.equal(prepareOptimizationProxy({ headers: disabled }, disabled), null)
    assert.equal(disabled.has(OPTIMIZATION_CONTEXT_HEADER), false)
  } finally { globalThis.fetch = originalFetch; for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]; Object.assign(process.env, before) }
})
