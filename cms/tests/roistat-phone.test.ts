import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { assignedPhone } from '../../src/lib/roistat-phone'
import { RoistatPhoneProvider, TrackedPhone } from '../../src/components/tracked-phone'

const data = encodeURIComponent(JSON.stringify([{ phone: '+7 (831) 200-38-67', replaceable_numbers: ['78312666645'] }]))

test('сервер сразу выводит назначенный Roistat номер и соответствующий tel', () => {
  const html = renderToString(createElement(RoistatPhoneProvider, { initialData: data, children:
    createElement(TrackedPhone, { href: 'tel:+78312666645', children: '+7 (831) 266-66-45' }),
  }))
  assert.match(html, /200-38-67/)
  assert.match(html, /tel:\+78312003867/)
  assert.doesNotMatch(html, /266-66-45/)
})

test('назначение не применяется к другому номеру и испорченной cookie', () => {
  assert.equal(assignedPhone(data, '88001234567'), undefined)
  assert.equal(assignedPhone('%broken', '78312666645'), undefined)
  assert.equal(assignedPhone('[]', '78312666645'), undefined)
})
