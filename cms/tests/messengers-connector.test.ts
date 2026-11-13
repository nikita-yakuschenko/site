import test from 'node:test'
import assert from 'node:assert/strict'
import { bitrixAuth, connectorId, connectorName, messageRows, parseBitrixBody, publisherName, registerParams } from '../src/messengers/bitrix-connector'

test('форма Bitrix сохраняет обычные вложенные поля и отбрасывает служебные имена', () => {
  const form = new URLSearchParams({ 'data[MESSAGES][0][chat][id]': 'telegram:peer:42', 'data[constructor]': 'ignored' })
  assert.deepEqual(parseBitrixBody(null, form.toString()), { data: { MESSAGES: [{ chat: { id: 'telegram:peer:42' } }] } })
})

test('канал называется Avangard Messengers, оба слова с большой буквы', () => {
  assert.equal(connectorName, 'Avangard Messengers')
  assert.deepEqual(connectorName.split(' '), ['Avangard', 'Messengers'])
  const params = registerParams('https://cms.avgst.ru/bitrix/messengers')
  assert.equal(params.NAME, 'Avangard Messengers')
  assert.equal(params.ID, connectorId)
  assert.equal(params.PLACEMENT_HANDLER, 'https://cms.avgst.ru/bitrix/messengers')
  assert.equal(publisherName, 'Avangard Web Platform')
  assert.match(params.ICON.DATA_IMAGE, /^data:image\/png;base64,/)
  assert.equal(params.ICON.COLOR, '#006ad0')
})

test('разбирает ответ оператора из формы Битрикс24', () => {
  const body = parseBitrixBody('application/x-www-form-urlencoded', new URLSearchParams({
    event: 'ONIMCONNECTORMESSAGEADD',
    'auth[domain]': 'avgstroy.bitrix24.ru',
    'auth[member_id]': 'member',
    'auth[application_token]': 'app-token',
    'data[LINE]': '41',
    'data[MESSAGES][0][im][message_id]': '900',
    'data[MESSAGES][0][message][text]': 'Паспорт во вложении',
    'data[MESSAGES][0][message][user_id]': '39',
    'data[MESSAGES][0][chat][id]': 'whatsapp:79001234567',
  }).toString())
  assert.equal(bitrixAuth(body).domain, 'avgstroy.bitrix24.ru')
  assert.deepEqual(messageRows(body), [{ line: '41', chatId: 'whatsapp:79001234567', text: 'Паспорт во вложении', bitrixMessageId: '900', userId: '39' }])
})

test('сессия мессенджера передаёт телефон и не отключает CRM', async () => {
  const { messengerSession, refreshMessengerAuth } = await import('../src/messengers/bitrix-connector')
  const message = messengerSession('telegram', '89990000000', 'lead-1', 'Заявка с сайта.')
  assert.ok(message)
  assert.equal(message.user.phone, '+79990000000')
  assert.equal(message.user.name, '+79990000000')
  assert.equal(message.chat.name, '+79990000000 - AM.Telegram')
  assert.equal(message.chat.id, 'telegram:79990000000')
  const named = messengerSession('whatsapp', '79990000000', 'in-1', 'Привет', { name: 'Иван', username: 'ivan_house' })
  assert.equal(named?.user.name, '@ivan_house')
  assert.equal(named?.chat.name, '@ivan_house - AM.WhatsApp')
  const byName = messengerSession('max', '79990000000', 'in-2', 'Привет', { name: 'Анна' })
  assert.equal(byName?.chat.name, 'Анна - AM.MAX')
  assert.equal(message.message.id, 'lead-1')
  assert.equal('disable_crm' in message.message, false)
  assert.equal('skip_phone_validate' in message.user, false)
  assert.equal(messengerSession('phone', '+79990000000', 'lead-1', 'Заявка с сайта.'), null)
  assert.equal(await refreshMessengerAuth('refresh-token'), null)
})
