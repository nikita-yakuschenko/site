import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seal, unseal, signToken, readToken } from '../src/automation/crypto'
import { defaultConfig, dmpMatches, renderTemplate } from '../src/automation/model'
import { validateSettings } from '../src/automation/validation'
import { calendar } from '../src/automation/calendar'
import { matchEvent } from '../src/automation/event-match'
import type { Event } from '../src/payload-types'

test('encrypted credentials and compatible legacy HMAC links reject tampering and expiry', () => {
  process.env.PAYLOAD_SECRET = 'unit-test-only-secret'
  const encrypted = seal('smtp-password')
  assert.equal(unseal(encrypted), 'smtp-password')
  assert.ok(!encrypted.includes('smtp-password'))
  const token = signToken({ entityId: 123, entityType: 'deal', email: 'person@example.test', exp: Date.now() + 60000 }, 'old-token-secret')
  assert.equal(readToken(token, 'old-token-secret').entityId, 123)
  assert.throws(() => readToken(token, 'wrong-secret'))
  assert.throws(() => readToken(signToken({ exp: Date.now() - 1 }, 'secret'), 'secret'))
})
test('DMP requires all configured criteria and keeps the actual production assignee', () => {
  const deal = { CATEGORY_ID: '0', STAGE_ID: 'NEW', SOURCE_ID: 'DMP', TITLE: 'DMP | Лид | 123' }
  assert.equal(defaultConfig.dmp.targetResponsible, 907)
  assert.equal(dmpMatches(deal, defaultConfig.dmp, 'DMP'), true)
  assert.equal(dmpMatches({ ...deal, TITLE: 'DMP|Лид|123' }, defaultConfig.dmp, 'DMP'), true)
  for (const patch of [{ CATEGORY_ID: '77' }, { STAGE_ID: 'WON' }, { SOURCE_ID: 'OTHER' }, { TITLE: 'Другой лид' }]) assert.equal(dmpMatches({ ...deal, ...patch }, defaultConfig.dmp, 'DMP'), false)
})
test('settings validation rejects invalid destinations and HTML variables are escaped', () => {
  assert.throws(() => validateSettings({ ...defaultConfig, crm: { domain: '127.0.0.1' } }))
  assert.throws(() => validateSettings({ ...defaultConfig, dmp: { ...defaultConfig.dmp, targetResponsible: -1 } }))
  assert.equal(renderTemplate('<p>{{name}}</p>', { name: '<img src=x>' }), '<p>&lt;img src=x&gt;</p>')
})
test('calendar uses actual event date, coordinates and valid UTF-8 folding; undated imports stay archived', () => {
  const current = { id: 1, title: 'День открытых дверей', slug: 'factory-open-day', status: 'published', crmTitleMatch: 'Регистрация на день открытых дверей', startsAt: '2026-11-14T07:00:00Z', endsAt: '2026-11-14T10:05:00Z', updatedAt: '2026-10-24T07:00:00Z', latitude: 56.366307, longitude: 43.791522, address: 'Нижний Новгород, ул. Зайцева, 31к1' } as Event
  const legacy = { ...current, id: 2, status: 'completed', slug: 'factory-open-day-legacy' } as Event
  const ics = calendar(current)
  assert.match(ics, /DTSTART:20261114T070000Z/)
  assert.match(ics, /GEO:56.366307;43.791522/)
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75)
  assert.equal(matchEvent([current, legacy], { TITLE: 'Регистрация на день открытых дверей 14 ноября' }, true)?.id, 1)
  assert.equal(matchEvent([current, legacy], { TITLE: 'Регистрация на день открытых дверей' }, true)?.id, 2)
})
