import assert from 'node:assert/strict'
import test from 'node:test'
import { formScrollDelta } from '../../src/components/use-mobile-form-reveal'

test('mobile forms stay still when visible, follow the bottom when fitting and align tall forms to the safe top', () => {
  assert.equal(formScrollDelta(100, 300, 60, 760), 0)
  assert.equal(formScrollDelta(600, 300, 60, 760), 140)
  assert.equal(formScrollDelta(600, 900, 60, 760), 540)
  assert.equal(formScrollDelta(600, 100, 60, 760, 900), 540)
  assert.equal(formScrollDelta(20, 300, 60, 760), -40)
})
