import assert from 'node:assert/strict'
import test from 'node:test'
import { planRequestDemoEnabled, planRequestFixturesEnabled } from '../../src/lib/plan-request-feature'
import { emptyRequirements, requirementsDetails, planDetailsSchema, planContactSchema, submitPlanRequestDemo, validateSketchFile } from '../../src/lib/plan-request'

test('plan prototype and its fixtures are disabled in production even when both flags are set', () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_PLAN_REQUEST_DEMO: process.env.NEXT_PUBLIC_PLAN_REQUEST_DEMO, PLAN_REQUEST_DEMO_FIXTURES: process.env.PLAN_REQUEST_DEMO_FIXTURES }
  try {
    Object.assign(process.env, { NODE_ENV: 'production', NEXT_PUBLIC_PLAN_REQUEST_DEMO: '1', PLAN_REQUEST_DEMO_FIXTURES: '1' })
    assert.equal(planRequestDemoEnabled(), false); assert.equal(planRequestFixturesEnabled(), false)
    Object.assign(process.env, { NODE_ENV: 'development' })
    assert.equal(planRequestDemoEnabled(), true); assert.equal(planRequestFixturesEnabled(), true)
    delete process.env.NEXT_PUBLIC_PLAN_REQUEST_DEMO
    assert.equal(planRequestDemoEnabled(), false)
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value } }
})

test('scenario data stays separate, room categories stay separate, and optional requirements may be empty', () => {
  assert.equal(planDetailsSchema.safeParse(requirementsDetails(emptyRequirements())).success, true)
  assert.equal(planDetailsSchema.safeParse({ mode: 'modify_current', wishes: { changes: [], comment: '' }, file: {} }).success, false)
  const request = requirementsDetails({ ...emptyRequirements(), extras: ['office', 'boiler', 'terrace'], rooms: [{ id: '1', kind: 'terrace', name: 'ignored', area: '24', category: 'heated' }], customArea: 'stale' })
  assert.equal(request.mode, 'custom_requirements')
  if (request.mode !== 'custom_requirements') throw Error('wrong mode')
  assert.deepEqual(request.wishes.extras.map(room => room.category), ['heated', 'engineering', 'outdoor'])
  assert.equal(request.wishes.rooms[0]!.category, 'outdoor')
  assert.equal(request.wishes.customArea, '')
  for (const customArea of ['', '0', '180-120', '-5', 'abc', '2001']) assert.equal(planDetailsSchema.safeParse(requirementsDetails({ ...emptyRequirements(), area: 'custom', customArea })).success, false)
  assert.equal(planDetailsSchema.safeParse(requirementsDetails({ ...emptyRequirements(), area: 'custom', customArea: '100–140' })).success, true)
})

test('sketch needs meaningful material, accepts description or http link, and rejects unsafe links', () => {
  const wishes = { file: null, link: '', comment: '' }
  assert.equal(planDetailsSchema.safeParse({ mode: 'own_sketch', wishes }).success, false)
  for (const link of ['javascript:alert(1)', 'data:text/html,test', 'ftp://example.com', 'https://user:password@example.com']) assert.equal(planDetailsSchema.safeParse({ mode: 'own_sketch', wishes: { ...wishes, link } }).success, false)
  assert.equal(planDetailsSchema.safeParse({ mode: 'own_sketch', wishes: { ...wishes, link: 'https://example.com/plan' } }).success, true)
  assert.equal(planDetailsSchema.safeParse({ mode: 'own_sketch', wishes: { ...wishes, comment: 'Эскиз с террасой' } }).success, true)
})

test('file validation checks size, extension, MIME and content signature without uploading anything', async () => {
  const pdf = new File(['%PDF-1.7\n'], 'sketch.pdf', { type: 'application/pdf' })
  assert.equal((await validateSketchFile(pdf)).type, 'application/pdf')
  await assert.rejects(validateSketchFile(new File(['not a PDF'], 'sketch.pdf', { type: 'application/pdf' })))
  await assert.rejects(validateSketchFile(new File(['%PDF-1.7'], 'sketch.svg', { type: 'image/svg+xml' })))
  await assert.rejects(validateSketchFile(new File(['%PDF-1.7'], 'sketch.pdf', { type: 'image/png' })))
  await assert.rejects(validateSketchFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })))
  await assert.rejects(validateSketchFile(new File([], 'empty.png', { type: 'image/png' })))
})

test('contact validation reuses existing name/phone rules and the adapter returns an honest local receipt', async () => {
  const contact = { name: 'Анна', phone: '+79991234567', preferredContact: 'call', comment: '', consent: true }
  assert.equal(planContactSchema.safeParse({ ...contact, name: '1' }).success, false)
  assert.equal(planContactSchema.safeParse({ ...contact, phone: '123' }).success, false)
  assert.equal(planContactSchema.safeParse({ ...contact, consent: false }).success, false)
  const previous = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_PLAN_REQUEST_DEMO: process.env.NEXT_PUBLIC_PLAN_REQUEST_DEMO }
  try {
    Object.assign(process.env, { NODE_ENV: 'development', NEXT_PUBLIC_PLAN_REQUEST_DEMO: '1' })
    const result = await submitPlanRequestDemo({ version: 1, context: { projectId: 'house', projectSlug: 'house', projectName: 'Дом', variant: { index: 1, label: 'Б' }, floor: { index: 0, label: '1 этаж' }, source: 'project-plans', sourcePath: '/catalog/house' }, details: { mode: 'modify_current', wishes: { changes: ['Добавить комнату'], comment: '' } }, contact })
    assert.equal(result.demo, true); assert.equal(result.request.contact.phone, '+79991234567'); assert.equal(result.request.context.variant?.index, 1)
    Object.assign(process.env, { NODE_ENV: 'production' })
    await assert.rejects(submitPlanRequestDemo(result.request), /выключена/)
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value } }
})
