import test from 'node:test'
import assert from 'node:assert/strict'
import { projectBlockOrder, normalizeProjectOrder, validProjectOrder } from '../src/config/project-order'

test('contacts are pinned without changing the relative order of other blocks', () => {
  const legacy = ['contactsSection', ...projectBlockOrder.filter(key => key !== 'contactsSection').reverse()]
  assert.equal(validProjectOrder(legacy), false)
  const fixed = normalizeProjectOrder(legacy)
  assert.deepEqual(fixed.slice(0, -1), legacy.slice(1))
  assert.equal(fixed.at(-1), 'contactsSection')
  assert.equal(validProjectOrder(fixed), true)
})
test('incomplete and duplicate orders fall back to the complete default', () => {
  assert.deepEqual(normalizeProjectOrder(['ProjectBuilt']), projectBlockOrder)
  assert.deepEqual(normalizeProjectOrder(projectBlockOrder.map(() => 'contactsSection')), projectBlockOrder)
})
