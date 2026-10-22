import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { parsePreferenceCodes, parsePreferenceSync, parseSetPreference, publicPreferenceResponse } from '../../src/lib/optimization/preferences-contracts'
import { readPreferenceIdentity, signPreferenceIdentity } from '../../src/lib/optimization/preference-identity'
import { preferenceIdentity } from '../src/optimization/likes'

const secret = 'ao02-unit-secret-at-least-32-characters'
const voter = 'a'.repeat(32)
test('set-state contract requires idempotency, revision and explicit source; rejects untrusted context', () => {
  const input = { liked: true, operation_id: randomUUID(), expected_revision: 0, source: 'project_card' }
  assert.deepEqual(parseSetPreference(input), input)
  for (const patch of [{ liked: 'true' }, { expected_revision: -1 }, { expected_revision: 1.5 }, { operation_id: 'bad' }, { source: 'guessed' }, { subject_key: 'forged' }, { project_id: 1 }, { email: 'test@example.invalid' }]) assert.equal(parseSetPreference({ ...input, ...patch }), null)
  assert.equal(parseSetPreference({ liked: true }), null)
})
test('batch contracts are bounded, strict about project codes and preserve exact migration attempts', () => {
  assert.deepEqual(parsePreferenceCodes(['AB12CDEF', 'AB12CDEF']), ['AB12CDEF'])
  assert.equal(parsePreferenceCodes(Array(101).fill('AB12CDEF')), null)
  assert.equal(parsePreferenceCodes(['cms:1']), null)
  const migration_id = randomUUID()
  assert.deepEqual(parsePreferenceSync({ migration_id, legacy_ids: ['cms:1', 'old-slug', 'AB12CDEF', 'old-slug'] }), { migration_id, legacy_ids: ['cms:1', 'old-slug', 'AB12CDEF'] })
  assert.equal(parsePreferenceSync({ migration_id, legacy_ids: ['referral:person@example.invalid'] }), null)
  assert.equal(parsePreferenceSync({ migration_id, legacy_ids: ['old-slug'], subject_key: 'forged' }), null)
})
test('signed browser identity cannot be replaced through an unsigned competing legacy cookie', () => {
  const signed = signPreferenceIdentity(voter, secret)
  assert.deepEqual(readPreferenceIdentity(signed, 'b'.repeat(32), secret), { id: voter, established: true })
  for (const invalid of [signed + '.', signed + '.extra', signed.replace(/^a/, 'b'), signed.slice(0, -1), 'x.y']) {
    assert.deepEqual(readPreferenceIdentity(invalid, voter, secret), { id: voter, established: false })
  }
  const fresh = readPreferenceIdentity(undefined, undefined, secret)
  assert.match(fresh.id, /^[a-f0-9]{32}$/)
  assert.equal(fresh.established, false)
  assert.throws(() => readPreferenceIdentity(signed, voter, 'short'))
})
test('canonical subjects are namespaced HMAC keys, never raw voter IDs or fingerprints', () => {
  const a = preferenceIdentity(`c:${voter}`, secret)
  assert.match(a.subjectKey, /^[a-f0-9]{64}$/)
  assert.notEqual(a.subjectKey, voter)
  assert.equal(a.subjectKey, preferenceIdentity(`c:${voter}`, secret, { fingerprintKey: `f:${'b'.repeat(64)}` }).subjectKey)
  assert.notEqual(a.subjectKey, preferenceIdentity(`c:${'b'.repeat(32)}`, secret).subjectKey)
  assert.throws(() => preferenceIdentity('f:device', secret))
})

test('public replies strip upstream debug fields and reject malformed preference data', () => {
  const state = { project_code: 'AB12CDEF', liked: true, likeCount: 1, revision: 1, reconciliation: 'ready' }
  assert.deepEqual(publicPreferenceResponse('set', { ...state, debug: { token: 'must-not-leak' } }, 200), state)
  assert.equal(publicPreferenceResponse('set', { ...state, likeCount: -1 }, 200), null)
  assert.deepEqual(publicPreferenceResponse('set', { error: 'stale_revision', current: { ...state, raw_cookie: 'must-not-leak' }, debug: 'hidden' }, 409), { error: 'stale_revision', current: state })
  assert.equal(publicPreferenceResponse('set', { error: 'arbitrary upstream error with credentials' }, 503), null)
})
