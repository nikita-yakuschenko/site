import test from 'node:test'
import assert from 'node:assert/strict'
import { deliverLead } from '../src/config/lead-adapters'
const lead = { name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true as const, formId: 'contacts-question', projectId: 'PROJ08AB', meta: { region: 'msk' } }
test('test adapter accepts a lead without any external request', async () => {
  const result = await deliverLead({ mode: 'test' }, lead, 'test-id', async () => { throw Error('unexpected network request') })
  assert.equal(result.status, 'test')
})
test('webhook receives the validated lead and request identifier; non-success fails', async () => {
  const result = await deliverLead({ mode: 'webhook', url: 'http://localhost:1234' }, lead, 'test-id', async (_url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), { id: 'test-id', lead })
    assert.equal(new Headers(init?.headers).get('X-Request-ID'), 'test-id')
    return new Response('{}')
  })
  assert.equal(result.status, 'sent')
  await assert.rejects(deliverLead({ mode: 'webhook', url: 'http://localhost:1234' }, lead, 'test-id', async () => new Response('{}', { status: 500 })))
})
test('disabled integration and unsupported URLs cannot report successful delivery', async () => {
  await assert.rejects(deliverLead({ mode: 'disabled' }, lead, 'test-id'))
  await assert.rejects(deliverLead({ mode: 'webhook', url: 'file:///test' }, lead, 'test-id'))
})
