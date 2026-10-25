import test from 'node:test'
import assert from 'node:assert/strict'
import { COOKIE_PROMPT_ENABLED, DEFAULT_CONSENT, hasConsent, type ConsentCategory } from '../../src/consent/types'

test('site integrations work immediately for new visitors and old restrictive cookies without claiming acceptance', () => {
  assert.equal(COOKIE_PROMPT_ENABLED, false)
  for (const category of ['necessary', 'functional', 'analytics', 'marketing'] as ConsentCategory[]) {
    assert.equal(hasConsent(null, category), true)
    assert.equal(hasConsent(DEFAULT_CONSENT, category), true)
  }
  assert.equal(DEFAULT_CONSENT.decidedAt, '')
})
