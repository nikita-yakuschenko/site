import assert from 'node:assert/strict'
import test from 'node:test'
import { generateRecordId, isRecordId } from '../../src/lib/record-id'

test('generated IDs have 8 uppercase Latin characters: 6 letters and 2 digits', () => {
  const positions = new Set<number>()
  for (let index = 0; index < 5000; index++) {
    const id = generateRecordId()
    assert.match(id, /^[A-Z0-9]{8}$/)
    assert.equal(id.replace(/\D/g, '').length, 2)
    assert.equal(id.replace(/[^A-Z]/g, '').length, 6)
    assert.ok(isRecordId(id))
    for (const [position, char] of [...id].entries()) if (/\d/.test(char)) positions.add(position)
  }
  // Digits are not tied to fixed positions
  assert.equal(positions.size, 8)
})

test('validator rejects every other shape', () => {
  for (const id of ['AAAAAA11', 'AB12CDEF', '11AAAAAA', 'A1AAAA1A']) assert.ok(isRecordId(id), id)
  for (const id of ['aaaaaa11', 'Ab12cdEf', 'AAAAAAA1', 'AAAAA111', 'AAAAAA1', 'AAAAAA111', 'AAAAA-11', 'АААААA11', 'AAAA AA11', 12345678, null]) assert.equal(isRecordId(id), false, String(id))
})
