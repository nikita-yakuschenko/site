import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForRoistatVisit } from '../../src/lib/roistat-visit'
import { submitLead } from '../../src/lib/submit-lead'
import { cleanupCategory } from '../../src/consent/cleanup'

test('визит ожидается до отправки, сохраняется при отказе от аналитики; сбой счётчика не блокирует заявку', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let cookie = ''
  const deleted: string[] = []
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    get cookie() { return cookie },
    set cookie(value: string) { deleted.push(value) },
  } })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
  try {
    const timer = setTimeout(() => { cookie = 'roistat_visit=123456' }, 100)
    let sent = false
    await submitLead({ meta: { project: 'Дом' } }, { current: null }, async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      assert.equal(body.meta.roistatVisit, '123456')
      assert.equal(body.meta.project, 'Дом')
      sent = true
      return Response.json({ accepted: true, id: 'test' })
    })
    clearTimeout(timer)
    assert.equal(sent, true)
    cleanupCategory('analytics')
    assert.equal(deleted.some(value => value.startsWith('roistat_visit=')), false)
    cookie = ''
    assert.equal(await waitForRoistatVisit(50), undefined)
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { roistat: { getVisit: () => '654321' } } })
    assert.equal(await waitForRoistatVisit(), '654321')
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
