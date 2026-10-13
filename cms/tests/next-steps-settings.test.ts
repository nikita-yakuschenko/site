import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeNextStepsSettings } from '../src/config/next-steps-settings'

test('legacy projects show both shared cards in their original order', () => {
  assert.deepEqual(normalizeNextStepsSettings(null), { enabled: true, visitEnabled: true, secondaryEnabled: true, order: 'visit-first' })
})

test('disabled cards and reverse order survive settings normalization', () => {
  assert.deepEqual(normalizeNextStepsSettings({ enabled: false, visitEnabled: false, secondaryEnabled: true, order: 'secondary-first' }), { enabled: false, visitEnabled: false, secondaryEnabled: true, order: 'secondary-first' })
})
