import assert from 'node:assert/strict'
import { test } from 'node:test'
import { wallTimeToISO, zonedParts } from '../src/components/admin/event-date'

test('event wall time uses the configured timezone rather than the browser timezone', () => {
  assert.equal(wallTimeToISO(2026, 11, 14, 10, 0, 'Europe/Moscow'), '2026-11-14T07:00:00.000Z')
  assert.equal(wallTimeToISO(2026, 1, 1, 0, 15, 'Europe/Moscow'), '2025-12-31T21:15:00.000Z')
  assert.equal(wallTimeToISO(2026, 7, 1, 10, 30, 'Europe/Berlin'), '2026-07-01T08:30:00.000Z')
  assert.deepEqual(zonedParts('2026-11-14T07:00:00Z', 'Europe/Moscow'), { day: 14, month: 11, year: 2026, hour: 10, minute: 0 })
})
