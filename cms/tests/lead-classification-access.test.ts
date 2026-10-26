import test from 'node:test'
import assert from 'node:assert/strict'
import type { PayloadRequest } from 'payload'
import { leadClassificationEndpoint } from '../src/collections/lead-classification-endpoint'

function request({ role = 'admin', blocked = false, origin = 'https://cms.avgst.ru', type = 'test', id = '42' } = {}) {
  const updates: Record<string, unknown>[] = []
  const req = {
    user: { collection: 'users', id: 1 },
    url: 'https://cms.avgst.ru/api/lead-submissions/42/classify',
    headers: new Headers({ origin }), routeParams: { id },
    json: async () => ({ type, payload: { name: 'Injected change' }, status: 'sent' }),
    payload: {
      findByID: async ({ collection }: { collection: string }) => collection === 'users'
        ? { role, isBlocked: blocked } : { id: 42, payload: { name: 'ТЕСТ' } },
      update: async (options: Record<string, unknown>) => { updates.push(options); return options.data },
    },
  } as unknown as PayloadRequest
  return { req, updates }
}
test('заблокированный сотрудник, наблюдатель и редактор не могут менять тип', async () => {
  for (const options of [{ blocked: true }, { role: 'viewer' }, { role: 'editor' }]) {
    const { req, updates } = request(options)
    assert.equal((await leadClassificationEndpoint.handler(req)).status, 403)
    assert.equal(updates.length, 0)
  }
})
test('запрос с другого сайта и некорректные данные отвергаются', async () => {
  for (const options of [{ origin: 'https://evil.example' }, { type: 'other' }, { id: 'NaN' }]) {
    const { req, updates } = request(options)
    assert.ok((await leadClassificationEndpoint.handler(req)).status >= 400)
    assert.equal(updates.length, 0)
  }
})
test('администратор меняет только классификацию; возврат к автоматике пересчитывает тип', async () => {
  for (const type of ['work', 'auto']) {
    const { req, updates } = request({ type })
    const response = await leadClassificationEndpoint.handler(req)
    assert.equal(response.status, 200)
    assert.equal(updates.length, 1)
    const data = updates[0]!.data as Record<string, unknown>
    assert.equal(data.leadType, type === 'auto' ? 'test' : 'work')
    assert.equal(data.typeSource, type === 'auto' ? 'auto' : 'manual')
    assert.deepEqual(Object.keys(data).sort(), ['leadType', 'typeReason', 'typeSource'])
  }
})
