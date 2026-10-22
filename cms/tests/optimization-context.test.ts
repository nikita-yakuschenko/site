import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { createOptimizationCookie, verifyOptimizationCookie, CONTEXT_LIFETIME_MS } from '../../src/lib/optimization/server-context'
import { signDecisionToken, verifyDecisionToken, INGESTION_GRACE_MS } from '../../src/lib/optimization/decision-token'
import { parseEventBatch } from '../../src/lib/optimization/contracts'

const secret = 'ao04-unit-context-secret-at-least-32-characters'
test('signed session context rejects tampering, wrong namespace, future and expired values', () => {
  const now = Date.now(), token = createOptimizationCookie(secret, now)
  const identity = verifyOptimizationCookie(token, secret, now)!
  assert.match(identity.subjectKey, /^[a-f0-9]{64}$/)
  assert.notEqual(identity.subjectKey, identity.sessionKey)
  assert.equal(verifyOptimizationCookie(token + '.extra', secret, now), null)
  assert.equal(verifyOptimizationCookie(token.slice(0, -1), secret, now), null)
  assert.equal(verifyOptimizationCookie(token, secret + 'other', now), null)
  assert.equal(verifyOptimizationCookie(token, secret, now + CONTEXT_LIFETIME_MS + 1), null)
  assert.equal(verifyOptimizationCookie(token, secret, now - 301_000), null)
})

test('decision signature binds immutable owner, region and expiry with a separate ingestion grace', () => {
  const now = Date.now(), owner = verifyOptimizationCookie(createOptimizationCookie(secret), secret)!
  const context = { decision_id: randomUUID(), subject_key: owner.subjectKey, session_key: owner.sessionKey, region: 'nn' as const, assigned_at: now, expires_at: now + 60_000 }
  const token = signDecisionToken(context, secret)
  assert.deepEqual(verifyDecisionToken(token, secret, now + 60_001), context)
  assert.equal(verifyDecisionToken(token, secret, now + 60_000 + INGESTION_GRACE_MS + 1), null)
  assert.equal(verifyDecisionToken(token.replace(/.$/, token.endsWith('a') ? 'b' : 'a'), secret), null)
  assert.equal(verifyDecisionToken(token + '.extra', secret), null)
  assert.equal(verifyOptimizationCookie(token, secret), null)
})

test('duplicate event UUIDs within a batch are rejected before any persistence', () => {
  const event = { event_id: randomUUID(), event_type: 'project_opened', occurred_at: new Date().toISOString(), region: 'nn', device_class: 'desktop', project_code: 'ABCDEF12', placement: 'project.page' }
  assert.deepEqual(parseEventBatch({ schema_version: 1, batch_id: randomUUID(), events: [event, event] }), { ok: false, reason: 'duplicate_event_id' })
})
