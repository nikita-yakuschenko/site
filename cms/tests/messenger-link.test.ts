import test from 'node:test'
import assert from 'node:assert/strict'
import { chatAddress, nationalPhone, readChat } from '../src/messengers/phone'
import { cardMarkup, settingsMarkup } from '../src/messengers/settings-page'

test('номер рабочего входа приводится к международному виду', () => {
  assert.equal(nationalPhone('8 (999) 000-00-00'), '79990000000')
  assert.equal(nationalPhone('9990000000'), '79990000000')
  assert.equal(chatAddress('whatsapp', '89990000000'), 'whatsapp:79990000000')
  assert.deepEqual(readChat('telegram:79990000000'), { channel: 'telegram', phone: '79990000000', id: '79990000000' })
  assert.equal(readChat('site').channel, '')
})

test('настройка канала показывает вход по коду, а не телефон посетителя', () => {
  const html = settingsMarkup(41, [{ channel: 'whatsapp', title: 'WhatsApp', status: 'off', phone: '', qr: '', hint: '' }, { channel: 'telegram', title: 'Telegram', status: 'off', phone: '', qr: '', hint: '' }, { channel: 'max', title: 'MAX', status: 'off', phone: '', qr: '', hint: '' }], { AUTH_ID: 'token' })
  assert.match(html, /Рабочие номера/)
  assert.match(html, /Связанные устройства/)
  assert.match(html, /Подключить/)
  assert.equal(html.includes('Авторизовать сессию'), false)
  assert.match(cardMarkup({ channel: 'max', title: 'MAX', status: 'on', phone: '79990000000', qr: '', hint: '' }), /Подключён, \+79990000000/)
})
