import test from 'node:test'
import assert from 'node:assert/strict'
import { assignedPhone } from '../../src/lib/roistat-phone'

const data = encodeURIComponent(JSON.stringify([{ phone: '+7 (831) 200-38-67', replaceable_numbers: ['78312666645'] }]))

test('назначение Roistat сопоставляется с исходным номером', () => {
  assert.equal(assignedPhone(data, '+7 (831) 266-66-45'), '+7 (831) 200-38-67')
})

test('назначение не применяется к другому номеру и испорченной cookie', () => {
  assert.equal(assignedPhone(data, '88001234567'), undefined)
  assert.equal(assignedPhone('%broken', '78312666645'), undefined)
  assert.equal(assignedPhone('[]', '78312666645'), undefined)
})
