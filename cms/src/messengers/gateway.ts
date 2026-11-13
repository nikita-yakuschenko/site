import type { Payload } from 'payload'
import { randomUUID } from 'node:crypto'
import { enqueue } from '../automation/store'
import { readdir } from 'node:fs/promises'
import { messengerChannels, messengerTitles, nationalPhone, readChat, type AccountView, type MessengerChannel } from './phone'
import { clearSession, rememberSession, restoreSession } from './session-store'
import { openVisitorChat } from './visitor-chat'
import { channelLine } from './lines'
import type { LinkHandle } from './whatsapp-link'

type Runtime = { view: AccountView, handle?: LinkHandle, password?: (value: string) => void, generation: number }

const runtimes = new Map<MessengerChannel, Runtime>()

export function accountViews() {
  return messengerChannels.map(channel => ({ ...runtime(channel).view }))
}

export async function beginLogin(payload: Payload, channel: MessengerChannel, options: { fresh?: boolean } = {}) {
  const current = runtime(channel)
  if (current.view.status === 'qr' || current.view.status === 'password' || current.view.status === 'on') return { ...current.view }
  const generation = current.generation + 1
  current.generation = generation
  current.view = { ...current.view, status: 'qr', qr: '', hint: 'Готовим код для входа.', phone: '' }
  // По кнопке «Подключить» начинаем с чистой сессии, иначе обрывок мешает выдаче QR.
  const hooks = {
    onQr: (image: string) => { if (current.generation === generation) current.view = { ...current.view, status: 'qr', qr: image, hint: '' } },
    onConnected: (phone: string) => { if (current.generation === generation) current.view = { ...current.view, status: 'on', qr: '', phone, hint: '' } },
    onMessage: (phone: string, text: string, person?: { name?: string, username?: string, peer?: string }, externalId?: string) => {
      if (current.generation !== generation) return
      const messageId = `${channel}-in-${externalId || randomUUID()}`
      void enqueue(payload, 'messenger-inbound', { channel, phone, text, person, messageId }, messageId)
        .catch(() => payload.logger.error('Не удалось сохранить входящее сообщение мессенджера'))
    },
    onSaved: () => { if (current.generation === generation) void rememberSession(payload, channel) },
    onHint: (hint: string) => { if (current.generation === generation && current.view.status === 'qr') current.view = { ...current.view, hint } },
    onError: (hint: string) => {
      if (current.generation !== generation) return
      if (hint === 'logged-out') { void disconnectAccount(payload, channel); return }
      current.view = { ...current.view, status: 'error', qr: '', hint: hint === 'closed' ? 'Связь прервалась. Нажмите «Подключить» ещё раз.' : hint.slice(0, 240) }
    },
    password: () => new Promise<string>(resolve => {
      if (current.generation !== generation) { resolve(''); return }
      current.view = { ...current.view, status: 'password', qr: '', hint: 'Это пароль двухэтапной защиты в приложении.' }
      current.password = resolve
    }),
  }
  try {
    await current.handle?.stop().catch(() => undefined)
    if (current.generation !== generation) return { ...current.view }
    if (options.fresh) await clearSession(payload, channel)
    const directory = await restoreSession(payload, channel)
    const handle = channel === 'whatsapp'
      ? await (await import('./whatsapp-link')).startWhatsApp(directory, hooks)
      : channel === 'telegram'
        ? await (await import('./telegram-link')).startTelegram(directory, hooks)
        : await (await import('./max-link')).startMax(directory, hooks)
    if (current.generation === generation) current.handle = handle
    else await handle.stop()
  } catch (error) {
    if (current.generation === generation) current.view = { ...current.view, status: 'error', qr: '', hint: error instanceof Error ? error.message.slice(0, 240) : 'Не удалось подключить номер' }
  }
  const deadline = Date.now() + 8000
  while (Date.now() < deadline && current.generation === generation && current.view.status === 'qr' && !current.view.qr) {
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  return { ...current.view }
}

export function submitPassword(channel: MessengerChannel, password: string) {
  const current = runtime(channel)
  const resolve = current.password
  current.password = undefined
  if (!resolve) return { ...current.view, hint: 'Пароль сейчас не запрашивается.' }
  resolve(password)
  current.view = { ...current.view, hint: 'Проверяем пароль.' }
  return { ...current.view }
}

export async function disconnectAccount(payload: Payload, channel: MessengerChannel) {
  const current = runtime(channel)
  current.generation += 1
  current.password?.('')
  await current.handle?.stop().catch(() => undefined)
  current.handle = undefined
  await clearSession(payload, channel)
  current.view = blank(channel)
  return { ...current.view }
}

export async function relayOperatorText(channel: MessengerChannel, chatId: string, text: string) {
  const parsed = readChat(chatId)
  if (parsed.channel !== channel) throw new Error('Канал диалога не совпадает с привязкой линии')
  const phone = parsed.phone || (/^(?:@|peer:)/.test(parsed.id) ? parsed.id : '')
  if (!phone || !text.trim()) throw new Error('Нет адреса получателя или текст сообщения пуст')
  const current = runtimes.get(channel)
  if (current?.view.status !== 'on' || !current.handle) throw new Error('Мессенджер отключён')
  await current.handle.send(phone, text.trim())
}

export async function startOutgoing(payload: Payload, channel: MessengerChannel, phone: string, text: string) {
  const national = nationalPhone(phone)
  const line = await channelLine(payload, channel)
  if (!national || !text.trim()) throw new Error('Укажите номер клиента и текст')
  if (!line) throw new Error('Сначала закрепите мессенджер за этой линией')
  const current = runtime(channel)
  if (current.view.status !== 'on' || !current.handle) throw new Error('Сначала подключите рабочий номер')
  await current.handle.send(national, text.trim())
  await openVisitorChat(payload, { channel, phone: national, text: text.trim(), messageId: `out-${Date.now()}` })
  current.view = { ...current.view, hint: 'Сообщение отправлено, диалог открыт в этой линии.' }
  return { ...current.view }
}

export async function noteVisitorLead(payload: Payload, lead: { phone: string, requestId?: string, meta?: Record<string, unknown> }) {
  const channel = typeof lead.meta?.channel === 'string' ? lead.meta.channel : ''
  if (channel !== 'whatsapp' && channel !== 'telegram' && channel !== 'max') return
  const phone = nationalPhone(lead.phone)
  if (!phone || runtime(channel).view.status !== 'on') return
  await openVisitorChat(payload, { channel, phone, text: `Клиент оставил номер и выбрал ${messengerTitles[channel]}.`, messageId: `lead-${lead.requestId || Date.now()}` })
}

export async function restoreCompanyNumbers(payload: Payload) {
  for (const channel of messengerChannels) {
    const directory = await restoreSession(payload, channel)
    const files = await readdir(directory).catch(() => [])
    if (files.length) await beginLogin(payload, channel)
  }
}

function runtime(channel: MessengerChannel): Runtime {
  const found = runtimes.get(channel)
  if (found) return found
  const created: Runtime = { view: blank(channel), generation: 0 }
  runtimes.set(channel, created)
  return created
}

function blank(channel: MessengerChannel): AccountView {
  return { channel, title: messengerTitles[channel], status: 'off', phone: '', qr: '', hint: '' }
}
