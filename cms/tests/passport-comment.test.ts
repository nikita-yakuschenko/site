import test from 'node:test'
import assert from 'node:assert/strict'
import { dealMatchesPassport, passportCommentText } from '../src/automation/passport-comment'

test('текст комментария просит менеджера отправить паспорт', () => {
  const text = passportCommentText({ projectName: 'Барнхаус', phone: '+79990000000', channel: 'whatsapp' })
  assert.match(text, /Паспорт проекта «Барнхаус»/)
  assert.match(text, /WhatsApp/)
  assert.match(text, /\+79990000000/)
  assert.match(text, /отправьте клиенту сами/i)
})

test('сделка паспорта отбирается по заголовку и дате', () => {
  const since = '2026-11-13T10:00:00+03:00'
  assert.equal(dealMatchesPassport({ TITLE: 'Посетитель направил запрос на получение паспорта проекта Барнхаус', DATE_CREATE: '2026-11-13T12:00:00+03:00' }, 'Посетитель направил запрос на получение паспорта проекта Барнхаус', since), true)
  assert.equal(dealMatchesPassport({ TITLE: 'Другая сделка', DATE_CREATE: '2026-11-13T12:00:00+03:00' }, 'Посетитель направил запрос на получение паспорта проекта Барнхаус', since), false)
  assert.equal(dealMatchesPassport({ TITLE: 'Запрос паспорта проекта', DATE_CREATE: '2026-11-12T09:00:00+03:00' }, 'x', since), false)
})
