import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registrationRows, registrationState, type ParticipantRow } from '../src/components/admin/registration-table'
const rows: ParticipantRow[] = Array.from({ length: 75 }, (_, index) => ({ id: index + 1, name: `Участник ${index + 1}`, email: `person-${index + 1}@example.test`, code: String(index + 1), status: index % 2 ? 'active' : 'pending', createdAt: new Date(2026, 0, index + 1).toISOString() }))
test('participant search and facets work beyond the former first fifty records', () => {
  assert.deepEqual(registrationRows(rows, registrationState(new URLSearchParams('q=person-71'))).map(r => r.id), [71])
  assert.equal(registrationRows(rows, registrationState(new URLSearchParams('status=active'))).length, 37)
  assert.equal(registrationRows(rows, registrationState(new URLSearchParams('q=person-71&status=active'))).length, 0)
})
test('sorting uses numeric codes in both directions and ignores invalid sort keys', () => {
  assert.deepEqual(registrationRows(rows, registrationState(new URLSearchParams('sort=code&direction=asc'))).slice(0, 3).map(r => r.code), ['1', '2', '3'])
  assert.equal(registrationRows(rows, registrationState(new URLSearchParams('sort=code&direction=desc')))[0].code, '75')
  assert.equal(registrationState(new URLSearchParams('sort=unknown&status=unknown,active')).sort, null)
  assert.deepEqual(registrationState(new URLSearchParams('status=unknown,active')).statuses, ['active'])
})
test('event registrations combine event and status filters', () => {
  const registrations = rows.map(row => ({ ...row, eventSlug: row.id % 3 ? 'current' : 'archive', status: row.id % 2 ? 'confirmed' : 'pending' }))
  const filtered = registrationRows(registrations, registrationState(new URLSearchParams('event=archive&status=confirmed')))
  assert.ok(filtered.length > 0)
  assert.ok(filtered.every(row => row.eventSlug === 'archive' && row.status === 'confirmed'))
})
