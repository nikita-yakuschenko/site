import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSentryDsn, sanitizeClientEvent } from '../../src/lib/monitoring.ts'

test('DSN from GlitchTip is accepted and turned into an envelope URL', () => {
  const parsed = parseSentryDsn('https://abc123def456@errors.avgst.ru/2')
  assert.deepEqual(parsed, { ingest: 'https://errors.avgst.ru/api/2/envelope/', key: 'abc123def456' })
})

test('empty or malformed DSN disables reporting', () => {
  assert.equal(parseSentryDsn(''), null)
  assert.equal(parseSentryDsn('https://errors.avgst.ru/2'), null)
  assert.equal(parseSentryDsn('https://not-a-key@errors.avgst.ru/project'), null)
})

test('client payload is bounded and tagged as client', () => {
  const event = sanitizeClientEvent('site', {
    message: ' boom ',
    stack: 'x'.repeat(20_000),
    type: 'TypeError',
    url: 'https://avgst.ru/',
    extra: { name: 'LCP', value: 3500, rating: 'poor', drop: { nested: true } },
  })
  assert.equal(event?.source, 'client')
  assert.equal(event?.app, 'site')
  assert.equal(event?.message, 'boom')
  assert.equal(event?.stack?.length, 8000)
  assert.equal(event?.extra?.name, 'LCP')
  assert.equal(typeof event?.extra?.drop, 'string')
})

test('garbage client payload is rejected', () => {
  assert.equal(sanitizeClientEvent('cms', null), null)
  assert.equal(sanitizeClientEvent('cms', { message: '' }), null)
  assert.equal(sanitizeClientEvent('cms', { message: 'x'.repeat(2001) }), null)
})
