import test from 'node:test'
import assert from 'node:assert/strict'
import { chatAddress, nationalPhone, readChat } from '../src/messengers/phone'
import { lineChannelName } from '../src/messengers/bitrix-connector'
import { bindingUpdate } from '../src/messengers/lines'
import { panelMarkup, settingsMarkup } from '../src/messengers/settings-page'

test('номер рабочего входа приводится к международному виду', () => {
  assert.equal(nationalPhone('8 (999) 000-00-00'), '79990000000')
  assert.equal(nationalPhone('9990000000'), '79990000000')
  assert.equal(chatAddress('whatsapp', '89990000000'), 'whatsapp:79990000000')
  assert.deepEqual(readChat('telegram:79990000000'), { channel: 'telegram', phone: '79990000000', id: '79990000000' })
  assert.equal(readChat('site').channel, '')
  assert.deepEqual(readChat('telegram:@abc1234567890'), { channel: 'telegram', phone: '', id: '@abc1234567890' })
})

test('линия закрепляется за одним мессенджером', () => {
  const first = bindingUpdate(41, 'whatsapp', { lineForChannel: 0, channelForLine: '' })
  assert.equal(first.set['messengerLineChannel:41'], 'whatsapp')
  assert.equal(first.set['messengerChannelLine:whatsapp'], '41')
  assert.deepEqual(first.clear, [])
  const moved = bindingUpdate(42, 'whatsapp', { lineForChannel: 41, channelForLine: '' })
  assert.deepEqual(moved.clear, ['messengerLineChannel:41'])
  const replaced = bindingUpdate(42, 'telegram', { lineForChannel: 0, channelForLine: 'whatsapp' })
  assert.deepEqual(replaced.clear, ['messengerChannelLine:whatsapp'])
})

test('настройка линии показывает один мессенджер и письмо первым', () => {
  const empty = settingsMarkup(41, '', undefined, { AUTH_ID: 'token' })
  assert.match(empty, /class="title"/)
  assert.match(empty, /Подключение мессенджера к открытой линии/)
  assert.match(empty, /какой мессенджер будет подключен к этой открытой линии/)
  assert.match(empty, /class="tile"/)
  assert.match(empty, /call\('bind','whatsapp'\)/)
  assert.match(empty, /#25D366/)
  assert.equal(empty.includes('Линия 41'), false)
  assert.equal(empty.includes('class="row"'), false)
  assert.equal(empty.includes('Авторизовать сессию'), false)
  assert.equal(lineChannelName('whatsapp'), 'WhatsApp.Avangard Messengers')
  assert.equal(lineChannelName(''), 'Avangard Messengers')
  const ready = panelMarkup(41, 'whatsapp', { channel: 'whatsapp', title: 'WhatsApp', status: 'on', phone: '79990000000', qr: '', hint: '' })
  assert.match(ready, /Подключён, \+79990000000/)
  assert.match(ready, /Написать первым/)
  assert.equal(ready.includes('Telegram'), false)
})

test('WhatsApp keeps the same chat after a phone-based outbound and an inbound LID with known phone', async () => {
  const { messengerSession } = await import('../src/messengers/bitrix-connector')
  const first = messengerSession('whatsapp', '79990000000', 'first', 'Привет')
  const reply = messengerSession('whatsapp', '79990000000', 'reply', 'Ответ', { name: 'Клиент', peer: '987654321@lid' })
  assert.equal(first?.chat.id, 'whatsapp:79990000000')
  assert.equal(reply?.chat.id, first?.chat.id)
  assert.equal(reply?.user.id, first?.user.id)
  assert.equal(reply?.user.name, 'Клиент')
  assert.equal(messengerSession('whatsapp', '', 'unknown', 'Ответ', { peer: '987654321@lid' })?.chat.id, 'whatsapp:peer:987654321@lid')
})

test('operator text removes the Bitrix header and preserves line breaks', async () => {
  const { operatorMessageText } = await import('../src/messengers/phone')
  assert.equal(operatorMessageText('[b]Оператор:[/b] [br]Привет[br][i]Как дела?[/i]'), 'Привет\nКак дела?')
  assert.equal(operatorMessageText('Смета [1]'), 'Смета [1]')
})
