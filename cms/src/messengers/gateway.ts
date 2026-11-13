import type { Payload } from 'payload'
import { readdir } from 'node:fs/promises'
import { messengerChannels, messengerTitles, nationalPhone, readChat, type AccountView, type MessengerChannel } from './phone'
import { clearSession, rememberSession, restoreSession } from './session-store'
import { openVisitorChat } from './visitor-chat'
import { channelLine } from './lines'
import type { LinkHandle } from './whatsapp-link'

type Runtime = { view: AccountView, handle?: LinkHandle, password?: (value: string) => void, generation: number }

const runtimes = new Map<MessengerChannel, Runtime>()
let payloadRef: Payload | null = null

export function accountViews() {
  return messengerChannels.map(channel => ({ ...runtime(channel).view }))
}

export async function beginLogin(payload: Payload, channel: MessengerChannel) {
  payloadRef = payload
  const current = runtime(channel)
  if (current.view.status === 'qr' || current.view.status === 'password' || current.view.status === 'on') return { ...current.view }
  const generation = current.generation + 1
  current.generation = generation
  current.view = { ...current.view, status: 'qr', qr: '', hint: 'Готовим код для входа.', phone: '' }
  const directory = await restoreSession(payload, channel)
  const hooks = {
    onQr: (image: string) => { if (current.generation === generation) current.view = { ...current.view, status: 'qr', qr: image, hint: '' } },
    onConnected: (phone: string) => { if (current.generation === generation) current.view = { ...current.view, status: 'on', qr: '', phone, hint: '' } },
    onMessage: (phone: string, text: string, person?: { name?: string, username?: string }) => { if (payloadRef) void openVisitorChat(payloadRef, { channel, phone, text, person, messageId: `${channel}-in-${Date.now()}` }).catch(() => undefined) },
    onSaved: () => { if (payloadRef) void rememberSession(payloadRef, channel) },
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
    current.handle = channel === 'whatsapp'
      ? await (await import('./whatsapp-link')).startWhatsApp(directory, hooks)
      : channel === 'telegram'
        ? await (await import('./telegram-link')).startTelegram(directory, hooks)
        : await (await import('./max-link')).startMax(directory, hooks)
  } catch (error) {
    current.view = { ...current.view, status: 'error', qr: '', hint: error instanceof Error ? error.message.slice(0, 240) : 'Не удалось подключить номер' }
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
  const phone = parsed.phone || (parsed.id.startsWith('@') ? parsed.id : '')
  if (!phone || !text.trim()) return
  const current = runtimes.get(channel)
  if (current?.view.status !== 'on' || !current.handle) return
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
  payloadRef = payload
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
