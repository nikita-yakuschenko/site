import test from 'node:test'
import assert from 'node:assert/strict'
import { acceptLead } from '../src/config/lead-intake'

const requestId = '711f5579-e8c4-475b-a047-f20cd180af20'
test('сохранённая заявка подтверждается до медленной внешней передачи', async () => {
  let work: (() => Promise<void>) | undefined
  let delivered = false
  let saved = false
  const result = await acceptLead({ requestId }, {
    find: async () => undefined,
    save: async id => { saved = true; return { id: 'receipt', requestId: id } },
    defer: callback => { work = callback },
    deliver: async () => { delivered = true; return { status: 'sent' } },
    update: async () => {}, report: () => {},
  })
  assert.equal(result.accepted, true)
  assert.equal(saved, true)
  assert.equal(delivered, false)
  await work!()
  assert.equal(delivered, true)
})

test('сбой интеграции сохраняет обращение и не отменяет подтверждение', async () => {
  let work: (() => Promise<void>) | undefined
  let status = 'pending'
  const result = await acceptLead({ requestId }, {
    find: async () => undefined,
    save: async id => ({ id: 'receipt', requestId: id }),
    defer: callback => { work = callback },
    deliver: async () => { throw new Error('timeout after remote acceptance') },
    update: async (_id, value) => { status = value.status }, report: () => {},
  })
  await work!()
  assert.equal(status, 'failed')
  assert.equal(result.accepted, true)
})

test('повторная и одновременная отправка не создают новую передачу', async () => {
  for (const concurrent of [false, true]) {
    let finds = 0
    const result = await acceptLead({ requestId }, {
      find: async () => { finds++; return concurrent && finds === 1 ? undefined : { id: 'receipt', requestId } },
      save: async () => { if (concurrent) throw Error('unique requestId'); throw Error('unexpected save') },
      defer: () => { throw Error('unexpected resend') },
      deliver: async () => { throw Error('unexpected delivery') }, update: async () => {}, report: () => {},
    })
    assert.equal(result.id, requestId)
  }
})

test('без сохранённой заявки подтверждение не возвращается', async () => {
  await assert.rejects(acceptLead({ requestId }, {
    find: async () => undefined, save: async () => { throw Error('database unavailable') },
    defer: () => { throw Error('unexpected delivery') }, deliver: async () => ({ status: 'sent' }),
    update: async () => {}, report: () => {},
  }), /database unavailable/)
})
