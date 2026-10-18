import test from 'node:test'
import assert from 'node:assert/strict'
import { deliverLead, deliveryIsEnabled, activeRoistatProjectId, normalizeRoistatCounters } from '../src/config/lead-adapters'
const lead = { name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true as const, formId: 'contacts-question', projectId: 'PROJ08AB', meta: { region: 'msk' } }
test('test adapter accepts a lead without any external request', async () => {
  const result = await deliverLead({ mode: 'test' }, lead, 'test-id', async () => { throw Error('unexpected network request') })
  assert.equal(result.status, 'test')
})
test('webhook receives the validated lead and request identifier; non-success fails', async () => {
  const result = await deliverLead({ mode: 'webhook', url: 'http://localhost:1234' }, lead, 'test-id', async (_url, init) => {
    const body = JSON.parse(String(init?.body))
    assert.deepEqual(body.lead, lead)
    assert.equal(body.id, 'test-id')
    assert.equal(body.title, 'Новая заявка с сайта: Задать вопрос')
    assert.equal(body.phone, lead.phone)
    assert.equal(body.name, lead.name)
    assert.equal(new Headers(init?.headers).get('X-Request-ID'), 'test-id')
    return new Response('{}')
  })
  assert.equal(result.status, 'sent')
  await assert.rejects(deliverLead({ mode: 'webhook', url: 'http://localhost:1234' }, lead, 'test-id', async () => new Response('{}', { status: 500 })))
})
test('roistat берёт адрес из настроек, иначе из окружения', async () => {
  const saved = process.env.ROISTAT_UNIVERSAL_WEBHOOK_URL
  try {
    delete process.env.ROISTAT_UNIVERSAL_WEBHOOK_URL
    await assert.rejects(deliverLead({ mode: 'roistat', url: 'http://localhost:1234' }, lead, 'test-id', async () => new Response('{}')), /integration-secret-missing/)
    process.env.ROISTAT_UNIVERSAL_WEBHOOK_URL = 'https://cloud.roistat.com/integration/webhook?key=env'
    const fromEnv = await deliverLead({ mode: 'roistat' }, { ...lead, meta: { roistatVisit: '202864' } }, 'test-id', async (url, init) => {
      assert.equal(String(url), 'https://cloud.roistat.com/integration/webhook?key=env')
      assert.equal(JSON.parse(String(init?.body)).roistat, '202864')
      return new Response('{}')
    })
    assert.equal(fromEnv.status, 'sent')
    const fromSettings = await deliverLead({ mode: 'roistat', roistatWebhookUrl: 'https://cloud.roistat.com/integration/webhook?key=panel' }, lead, 'test-id', async (url) => {
      assert.equal(String(url), 'https://cloud.roistat.com/integration/webhook?key=panel')
      return new Response('{}')
    })
    assert.equal(fromSettings.status, 'sent')
  } finally {
    if (saved === undefined) delete process.env.ROISTAT_UNIVERSAL_WEBHOOK_URL
    else process.env.ROISTAT_UNIVERSAL_WEBHOOK_URL = saved
  }
})
test('disabled integration and unsupported URLs cannot report successful delivery', async () => {
  await assert.rejects(deliverLead({ mode: 'disabled' }, lead, 'test-id'))
  await assert.rejects(deliverLead({ mode: 'roistat', deliveryEnabled: false, roistatWebhookUrl: 'https://cloud.roistat.com/integration/webhook?key=x' }, lead, 'test-id'))
  await assert.rejects(deliverLead({ mode: 'webhook', url: 'file:///test' }, lead, 'test-id'))
  assert.equal(deliveryIsEnabled({ mode: 'roistat', deliveryEnabled: false }), false)
  assert.equal(deliveryIsEnabled({ mode: 'roistat' }), true)
})
test('active counter is the first enabled project id', () => {
  assert.deepEqual(normalizeRoistatCounters([{ projectId: 'a8d2dafd7f03641ecee21e18684113d2', connectedAt: '2026-10-18', enabled: true }]), [{ projectId: 'a8d2dafd7f03641ecee21e18684113d2', connectedAt: '2026-10-18', enabled: true }])
  assert.deepEqual(activeRoistatProjectId([{ projectId: 'deadbeefdeadbeef', connectedAt: '2026-01-01', enabled: false }, { projectId: 'cafebabecafebabe', connectedAt: '2026-02-02', enabled: true }]), { projectId: 'cafebabecafebabe', configured: true })
  assert.deepEqual(activeRoistatProjectId([{ projectId: 'deadbeefdeadbeef', connectedAt: '2026-01-01', enabled: false }]), { projectId: null, configured: true })
})
