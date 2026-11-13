import type { Payload } from 'payload'
import { bitrixCall, connectorId, messengerSession, portalDomain } from './bitrix-connector'
import { currentMessengerToken } from './authorize-lead'
import type { MessengerChannel } from './phone'
import { channelLine } from './lines'

// Карточка посетителя в открытой линии. Телефон здесь — номер клиента, номер компании к этому вызову не относится.
export async function openVisitorChat(payload: Payload, input: { channel: MessengerChannel, phone: string, text: string, messageId: string, person?: { name?: string, username?: string, peer?: string } }, options: { requireLine?: boolean } = {}) {
  const message = messengerSession(input.channel, input.phone, input.messageId, input.text, input.person)
  if (!message) {
    if (options.requireLine) throw new Error('Не удалось определить диалог или сообщение')
    return
  }
  const line = await channelLine(payload, input.channel)
  if (!line) {
    if (options.requireLine) throw new Error('Мессенджер не закреплён за линией')
    return
  }
  const token = await currentMessengerToken(payload)
  await bitrixCall(portalDomain, token, 'imconnector.send.messages', { CONNECTOR: connectorId, LINE: line, MESSAGES: [message] })
}
