import test from 'node:test'
import assert from 'node:assert/strict'
import { submitLead } from '../../src/lib/submit-lead'
import { trackVkPageView } from '../../src/lib/vk-pixel'
import { CONSENT_VERSION } from '../../src/consent/types'

test('VK: без согласия, один загрузчик, подтверждение заявки, повторы и ошибки', async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  let consentCookie = ''
  let url = 'https://avgst.ru/'
  const events: unknown[] = []
  const scripts: unknown[] = []
  const browser = { location: { get href() { return url } }, _tmr: events }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    get cookie() {
      return `roistat_visit=123${consentCookie}`
    },
    getElementById: () => scripts[0],
    createElement: () => ({}),
    head: { appendChild: (script: unknown) => scripts.push(script) },
  } })
  const accepted: typeof fetch = async () => Response.json({ accepted: true, id: 'lead' })
  const goals = () => events.filter(event => (event as { type: string }).type === 'reachGoal')
  try {
    trackVkPageView()
    trackVkPageView()
    assert.equal(events.length, 1)
    url = 'https://avgst.ru/catalog'
    trackVkPageView()
    assert.equal(events.length, 2)
    assert.equal(scripts.length, 1)
    assert.equal((scripts[0] as { src: string }).src, 'https://top-fwz1.mail.ru/js/code.js')

    const attempt = { current: null }
    await assert.rejects(submitLead({}, attempt, async () => Response.json({ accepted: false })))
    await assert.rejects(submitLead({}, attempt, async () => Response.json({ accepted: true }, { status: 500 })))
    await assert.rejects(submitLead({}, attempt, async () => { throw new Error('offline') }))
    assert.equal(goals().length, 0)
    await submitLead({}, attempt, accepted)
    await submitLead({}, attempt, accepted)
    assert.deepEqual(goals(), [{ type: 'reachGoal', id: 3807543, goal: 'GOAL_NAME' }])
    await submitLead({ phone: 'private' }, attempt, accepted)
    assert.equal(goals().length, 2)
    assert.equal(JSON.stringify(events).includes('private'), false)

    consentCookie = `; avgst_cookie_consent=${encodeURIComponent(JSON.stringify({ version: CONSENT_VERSION, decidedAt: new Date().toISOString(), necessary: true, functional: false, analytics: false, marketing: false }))}`
    const count = events.length
    url = 'https://avgst.ru/contacts'
    trackVkPageView()
    await submitLead({}, { current: null }, accepted)
    assert.equal(events.length, count + 2)
    assert.equal(goals().length, 3)

    Object.defineProperty(browser, '_tmr', { value: { push: () => { throw new Error('blocked') } } })
    assert.equal((await submitLead({}, { current: null }, accepted)).accepted, true)
  } finally {
    if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
    else Reflect.deleteProperty(globalThis, 'document')
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  }
})
