import test from 'node:test'
import assert from 'node:assert/strict'
import { submitLead, type LeadAttempt } from '../../src/lib/submit-lead'

test('повтор после обрыва ответа сохраняет ключ, новые данные получают новый', async () => {
  const attempt: LeadAttempt = { current: null }
  const ids: string[] = []
  const request: typeof fetch = async (_url, init) => {
    ids.push(JSON.parse(String(init?.body)).requestId)
    if (ids.length === 1) throw new Error('connection lost after save')
    return Response.json({ accepted: true, id: ids.at(-1) }, { status: 202 })
  }
  await assert.rejects(submitLead({ name: 'Test' }, attempt, request))
  await submitLead({ name: 'Test' }, attempt, request)
  await submitLead({ name: 'Another' }, attempt, request)
  assert.equal(ids[0], ids[1])
  assert.notEqual(ids[1], ids[2])
})

test('HTTP 200 без подтверждённой заявки не считается успехом', async () => {
  await assert.rejects(submitLead({}, { current: null }, async () => Response.json({ accepted: false })), /lead-not-confirmed/)
})
