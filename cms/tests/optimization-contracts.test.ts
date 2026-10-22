import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_EVENT_BATCH_SIZE, MAX_EVENT_BODY_BYTES, decodeEventBatch, parseClientEvent, parseEventBatch } from '../../src/lib/optimization/contracts'
import { optimizationFlags } from '../src/optimization/flags'

const now = Date.parse('2026-10-21T12:00:00.000Z')
const id = 'e1f1021a-b503-43c3-a201-551e0176ef2a'
const impression = {
  event_id: id, event_type: 'project_impression', occurred_at: new Date(now).toISOString(),
  region: 'nn', device_class: 'mobile', project_code: 'AB12CDEF', placement: 'home.popular_projects',
  decision_id: id, exposure_id: id, slot_position: 1,
}

test('accepts an actual impression contract and an unbound direct page open', () => {
  assert.equal(parseClientEvent(impression, now).ok, true)
  const { decision_id, exposure_id, slot_position, ...direct } = impression
  void decision_id; void exposure_id; void slot_position
  assert.equal(parseClientEvent({ ...direct, event_type: 'project_opened', placement: 'project.page' }, now).ok, true)
  assert.equal(parseClientEvent({ ...direct, event_type: 'project_impression' }, now).ok, false)
})

test('rejects forged server facts and every unallowlisted field, including nested PII', () => {
  for (const event_type of ['lead_accepted', 'project_liked', 'ranking_assigned', 'lead_crm_outcome']) {
    assert.equal(parseClientEvent({ ...impression, event_type }, now).ok, false)
  }
  for (const field of ['phone', 'email', 'metadata', 'reward', 'project_id', 'anonymous_subject_id', 'sourceUrl']) {
    assert.equal(parseClientEvent({ ...impression, [field]: { email: 'test@example.invalid' } }, now).ok, false)
  }
})

test('rejects incomplete exposure attribution and invalid project identities', () => {
  for (const slot_position of [0, 7, 1.5, '1']) assert.equal(parseClientEvent({ ...impression, slot_position }, now).ok, false)
  for (const project_code of ['cms:1', 'referral:x', 'ABC123DE', 'abcdefgh', 'old-slug']) assert.equal(parseClientEvent({ ...impression, project_code }, now).ok, false)
  assert.equal(parseClientEvent({ ...impression, exposure_id: undefined }, now).ok, false)
  assert.equal(parseClientEvent({ ...impression, placement: 'catalog.grid' }, now).ok, false)
})

test('time validation rejects stale, future and normalized invalid calendar dates', () => {
  for (const occurred_at of ['invalid', '2026-10-22T12:00:00.000Z', '2026-10-19T12:00:00.000Z', '2026-02-30T12:00:00.000Z']) {
    assert.equal(parseClientEvent({ ...impression, occurred_at }, now).ok, false)
  }
})

test('distinguishes copy from web share and preserves exact legacy form IDs', () => {
  for (const share_method of ['copy', 'web_share']) assert.equal(parseClientEvent({ ...impression, event_type: 'project_shared', share_method }, now).ok, true)
  assert.equal(parseClientEvent({ ...impression, event_type: 'project_shared', share_method: 'cancelled' }, now).ok, false)
  const form = { event_id: id, event_type: 'form_opened', occurred_at: new Date(now).toISOString(), region: 'nn', device_class: 'desktop', form_id: 'FactoryOpenDayForm', source_component: 'factory.open_day' }
  assert.equal(parseClientEvent(form, now).ok, true)
  assert.equal(parseClientEvent({ ...form, source_component: 'guess-from-url' }, now).ok, false)
})

test('bounds batches and requires a decision token without accepting browser identity', () => {
  const batch = { schema_version: 1, batch_id: id, decision_token: 'signed.token', events: [impression] }
  assert.equal(parseEventBatch(batch, now).ok, true)
  assert.equal(parseEventBatch({ ...batch, decision_token: undefined }, now).ok, false)
  assert.equal(parseEventBatch({ ...batch, schema_version: 2 }, now).ok, false)
  assert.equal(parseEventBatch({ ...batch, events: [] }, now).ok, false)
  assert.equal(parseEventBatch({ ...batch, events: Array(MAX_EVENT_BATCH_SIZE + 1).fill(impression) }, now).ok, false)
  assert.equal(parseEventBatch({ ...batch, subject_key: 'forged' }, now).ok, false)
})

test('feature switches fail closed and require the master switch', () => {
  assert.deepEqual(optimizationFlags({}), { enabled: false, events: false, ranking: false, preferences: false })
  assert.equal(optimizationFlags({ OPTIMIZATION_RANKING_ENABLED: 'true' }).ranking, false)
  assert.equal(optimizationFlags({ OPTIMIZATION_ENABLED: '1', OPTIMIZATION_EVENTS_ENABLED: 'true' }).events, false)
  assert.equal(optimizationFlags({ OPTIMIZATION_ENABLED: 'true', OPTIMIZATION_EVENTS_ENABLED: 'true' }).events, true)
})

test('raw transport rejects oversized UTF-8 bodies before parsing and malformed JSON', () => {
  assert.deepEqual(decodeEventBatch('я'.repeat(MAX_EVENT_BODY_BYTES), now), { ok: false, reason: 'body_size' })
  assert.deepEqual(decodeEventBatch('{', now), { ok: false, reason: 'bad_json' })
})
