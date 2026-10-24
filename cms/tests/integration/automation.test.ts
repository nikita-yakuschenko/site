import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import nodemailer from 'nodemailer'
import { getPayload } from 'payload'
import { saveSettings, settings, enqueue, claimJob, finishJob, failJob } from '../../src/automation/store'
import { defaultConfig } from '../../src/automation/model'
import { register, confirmRegistration, confirmToken } from '../../src/automation/registrations'
import { processJob } from '../../src/automation/worker'
import { seedOpenDay } from '../../src/automation/seed'
import { signToken } from '../../src/automation/crypto'
import { importCrm } from '../../src/automation/import'

test('durable registrations, independent confirmations, email queue, DMP idempotency and leases', { skip: process.env.CMS_AUTOMATION_TEST_DATABASE !== 'true', timeout: 120000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname), 'Only an explicitly designated local test DB')
  process.env.CMS_MAINTENANCE = '1'
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config }), suffix = randomUUID()
  const fetchBefore = globalThis.fetch, mailBefore = nodemailer.createTransport
  try {
    await seedOpenDay(payload)
    const event = (await payload.find({ collection: 'events', where: { slug: { equals: 'factory-open-day' } }, limit: 1 })).docs[0]
    await payload.update({ collection: 'events', id: event.id, data: { startsAt: '2099-11-14T07:00:00Z', endsAt: '2099-11-14T10:05:00Z' } })
    await saveSettings(payload, { ...defaultConfig, referral: { ...defaultConfig.referral, enabled: true }, mail: { ...defaultConfig.mail, enabled: true, host: 'smtp.example.test', from: 'test@example.test' }, dmp: { ...defaultConfig.dmp, enabled: true, dryRun: false, targetStage: 'C77:NEW' } }, { tokenSecret: 'legacy-secret', smtpPassword: 'never-return-this', bitrixWebhook: 'https://avgstroy.bitrix24.ru/rest/1/test/', dmpWebhook: 'https://avgstroy.bitrix24.ru/rest/1/test/' }, { active: true })
    assert.equal((await settings(payload)).secret('smtpPassword'), 'never-return-this')
    const person = { name: '<Участник>', email: `automation-${suffix}@example.test`, phone: '+79991234567' }
    const referral = await register(payload, 'referral', person)
    const registration = await register(payload, 'event', person)
    assert.equal(referral.status, 'pending'); assert.equal(registration.status, 'pending')
    await confirmRegistration(payload, 'referral', referral)
    assert.equal((await payload.findByID({ collection: 'event-registrations', id: registration.id })).status, 'pending')
    const before = (await payload.count({ collection: 'automation-jobs' })).totalDocs
    await confirmRegistration(payload, 'referral', referral)
    assert.equal((await payload.count({ collection: 'automation-jobs' })).totalDocs, before, 'confirmation is repeatable without duplicate jobs')
    const token = signToken({ flow: 'event', recordId: registration.id, email: person.email, version: registration.tokenVersion, exp: Date.now() + 60000 }, 'legacy-secret')
    await confirmToken(payload, token)
    assert.equal((await payload.findByID({ collection: 'event-registrations', id: registration.id })).status, 'confirmed')
    const delivered: Record<string, unknown>[] = []
    Object.assign(nodemailer, { createTransport: () => ({ sendMail: async (mail: Record<string, unknown>) => { delivered.push(mail); return { accepted: [person.email] } }, close: () => {} }) })
    await processJob(payload, 'email', { flow: 'event', recordId: registration.id, template: 'programme', deliveryKey: 'integration-test' })
    assert.equal(delivered.length, 1)
    assert.equal(delivered[0].to, person.email)
    assert.ok(String(delivered[0].html).includes('&lt;Участник&gt;'))
    assert.ok(String((delivered[0].icalEvent as { content: string }).content).includes('20991114T070000Z'))
    let moved = false, updates = 0
    globalThis.fetch = (async (url: string | URL | Request) => {
      const method = String(url).split('/').at(-1)
      const result = method === 'crm.deal.get.json' ? { ID: '123', CATEGORY_ID: moved ? '77' : '0', STAGE_ID: moved ? 'C77:NEW' : 'NEW', SOURCE_ID: 'DMP', TITLE: 'DMP | Лид | Test' } : method === 'crm.status.list.json' ? [{ STATUS_ID: 'DMP', NAME: 'DMP' }] : (updates++, moved = true, {})
      return Response.json({ result })
    }) as typeof fetch
    assert.equal((await processJob(payload, 'dmp', { dealId: '123' })).matched, true)
    assert.equal((await processJob(payload, 'dmp', { dealId: '123' })).matched, false)
    assert.equal(updates, 1)
    const jobCountBeforeImport = (await payload.count({ collection: 'automation-jobs' })).totalDocs
    const contactIds = [String(Date.now()), String(Date.now() + 1)]
    globalThis.fetch = (async (url: string | URL | Request) => Response.json({ result: String(url).includes('crm.contact.list') ? contactIds.map(ID => ({ ID, NAME: 'Импорт', EMAIL: [{ VALUE: `shared-${suffix}@example.test` }], [defaultConfig.referral.participantField]: '1', [defaultConfig.referral.linkField]: `https://avgst.ru/?ref=${ID}` })) : [] })) as typeof fetch
    await importCrm(payload)
    const imported = await payload.find({ collection: 'referral-participants', where: { email: { equals: `shared-${suffix}@example.test` } } })
    assert.equal(imported.totalDocs, 2, 'different CRM participants sharing email retain separate codes')
    assert.deepEqual(imported.docs.map(r => r.code).sort(), contactIds.sort())
    assert.equal((await payload.count({ collection: 'automation-jobs' })).totalDocs, jobCountBeforeImport, 'CRM import is silent')
    await confirmRegistration(payload, 'referral', imported.docs[0])
    assert.equal((await payload.count({ collection: 'automation-jobs' })).totalDocs, jobCountBeforeImport, 'historic confirmations do not resend mail or regress CRM stages')
    const limited = await payload.create({ collection: 'events', data: { title: 'Одно место', slug: `capacity-${suffix}`, status: 'published', startsAt: '2099-11-14T07:00:00Z', endsAt: '2099-11-14T10:00:00Z', registrationEnabled: true, capacity: 1 } })
    const attempts = await Promise.allSettled([register(payload, 'event', { ...person, email: `one-${suffix}@example.test` }, limited.slug), register(payload, 'event', { ...person, email: `two-${suffix}@example.test` }, limited.slug)])
    assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1, 'concurrent requests cannot exceed capacity')
    const { GET, POST } = await import('../../src/app/api/automation/[action]/route')
    globalThis.fetch = fetchBefore
    assert.equal((await GET(new Request('http://localhost:3001/api/automation/settings'), { params: Promise.resolve({ action: 'settings' }) })).status, 401)
    assert.equal((await POST(new Request('http://localhost:3001/api/automation/dmp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'ONCRMDEALADD', auth: { domain: 'avgstroy.bitrix24.ru', application_token: 'wrong' }, data: { FIELDS: { ID: 123 } } }) }), { params: Promise.resolve({ action: 'dmp' }) })).status, 401)
    await enqueue(payload, 'lease-test', {}, `lease-${suffix}`)
    const [one, two] = await Promise.all([claimJob(payload), claimJob(payload)])
    assert.ok(one && two); assert.notEqual(one.job.id, two.job.id)
    await finishJob(payload, one.job.id, 'wrong-lease', { done: true })
    assert.equal((await payload.findByID({ collection: 'automation-jobs', id: one.job.id })).status, 'running')
    await finishJob(payload, one.job.id, one.lease, { done: true })
    await failJob(payload, two.job.id, two.lease, 12, new Error('SMTP unavailable'))
    assert.equal((await payload.findByID({ collection: 'automation-jobs', id: two.job.id })).status, 'failed')
    const receipt = await payload.create({ collection: 'lead-submissions', data: { requestId: randomUUID(), formId: 'referral-program', status: 'pending', payload: { formId: 'referral-program', name: person.name, phone: person.phone, meta: { email: `intake-${suffix}@example.test` } } } })
    const intake = (await payload.find({ collection: 'automation-jobs', where: { key: { equals: `intake:${receipt.requestId}` } } })).docs[0]
    assert.ok(intake, 'lead receipt and durable intake job are saved together')
    await processJob(payload, 'intake', intake.data as Record<string, unknown>)
    assert.equal((await payload.find({ collection: 'referral-participants', where: { email: { equals: `intake-${suffix}@example.test` } } })).totalDocs, 1)
  } finally { globalThis.fetch = fetchBefore; Object.assign(nodemailer, { createTransport: mailBefore }); await payload.destroy() }
})
