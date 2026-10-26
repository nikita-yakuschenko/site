import { test, expect } from '@playwright/test'
import { bindMetricaFormGoals, trackMetricaFormSuccess } from '../src/lib/metrica-form-goals'
import { submitLead } from '../src/lib/submit-lead'
import definitions from '../src/lib/metrica-goals.json' with { type: 'json' }

test.describe.configure({ mode: 'serial' })

test('queues until Metrica is ready and deduplicates by saved receipt', () => {
  const calls: unknown[][] = []
  trackMetricaFormSuccess('early-receipt', 'FactoryOpenDayForm')
  bindMetricaFormGoals((...args) => { calls.push(args) })
  trackMetricaFormSuccess('early-receipt', 'FactoryOpenDayForm')
  expect(calls).toEqual([
    ['lead_success', { form_id: 'FactoryOpenDayForm' }],
    ['lead_open_day', { form_id: 'FactoryOpenDayForm' }],
  ])
})

test('all form IDs get one common and one specific event, including CMS promo keys', () => {
  const calls: unknown[][] = []
  bindMetricaFormGoals((...args) => { calls.push(args) })
  for (const definition of definitions.filter(goal => goal.formIds.length)) {
    for (const formId of definition.formIds) {
      calls.length = 0
      trackMetricaFormSuccess(`mapping-${formId}`, formId)
      expect(calls).toEqual([
        ['lead_success', { form_id: formId }],
        [definition.event, { form_id: formId }],
      ])
    }
  }
  calls.length = 0
  trackMetricaFormSuccess('cms-promo', 'custom-cms-promo')
  expect(calls).toEqual([
    ['lead_success', { form_id: 'custom-cms-promo' }],
    ['lead_other', { form_id: 'custom-cms-promo' }],
  ])
})

test('submission counts only accepted receipts, with no form contact data or retry duplicates', async () => {
  const calls: unknown[][] = []
  bindMetricaFormGoals((...args) => { calls.push(args) })
  const attempt = { current: null }
  const payload = { formId: 'contacts-question', name: 'Private name', phone: '+79000000000', message: 'Private message' }
  for (const response of [Response.json({ accepted: true }, { status: 500 }), Response.json({ accepted: false }), Response.json({ error: 'captcha-failed' }, { status: 403 })]) {
    await expect(submitLead(payload, attempt, async () => response)).rejects.toThrow()
  }
  await expect(submitLead(payload, attempt, async () => { throw new Error('Network error') })).rejects.toThrow()
  expect(calls).toEqual([])
  for (let i = 0; i < 2; i++) await submitLead(payload, attempt, async () => Response.json({ accepted: true, id: 'saved-receipt' }))
  expect(calls).toEqual([
    ['lead_success', { form_id: 'contacts-question' }],
    ['lead_question', { form_id: 'contacts-question' }],
  ])
})

test('analytics failure does not turn a saved lead into a submission error', async () => {
  bindMetricaFormGoals(() => { throw new Error('Blocked analytics') })
  const result = await submitLead({ formId: 'ready-home-offer' }, { current: null }, async () => Response.json({ accepted: true, id: 'blocked-analytics-receipt' }))
  expect(result.accepted).toBe(true)
  const calls: unknown[][] = []
  bindMetricaFormGoals((...args) => { calls.push(args) })
  expect(calls).toHaveLength(2)
})
