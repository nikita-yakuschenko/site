import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { messengerTitles, type MessengerChannel } from './phone'

// Видимое имя канала в Битрикс24. Оба слова с большой буквы.
export const connectorName = 'Avangard Messengers'

// Имя канала на конкретной линии: WhatsApp.Avangard Messengers.
export function lineChannelName(channel: MessengerChannel | '') {
  return channel ? `${messengerTitles[channel]}.${connectorName}` : connectorName
}
export const connectorId = 'avangard_messengers'
export const publisherName = 'Avangard Web Platform'
export const portalDomain = 'avgstroy.bitrix24.ru'

function loadLogo() {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), 'logo.png'),
    join(process.cwd(), 'src/messengers/logo.png'),
    join(process.cwd(), 'cms/src/messengers/logo.png'),
    '/opt/release/cms/src/messengers/logo.png',
  ]
  for (const file of candidates) {
    try { return readFileSync(file) } catch { /* следующий путь */ }
  }
  throw new Error('Нет логотипа канала')
}

function icon(color: string) {
  return { DATA_IMAGE: `data:image/png;base64,${loadLogo().toString('base64')}`, COLOR: color, SIZE: '100%', POSITION: 'center' }
}

export function registerParams(handlerUrl: string) {
  return {
    ID: connectorId,
    NAME: connectorName,
    ICON: icon('#006ad0'),
    ICON_DISABLED: icon('#99adb3'),
    PLACEMENT_HANDLER: handlerUrl,
    CHAT_GROUP: false,
  }
}

// Провайдеры для «Каналы связи» в сделке. TYPE в API всегда SMS, имя — мессенджер.
export const messageSenderCodes = {
  whatsapp: 'avgst_whatsapp',
  telegram: 'avgst_telegram',
  max: 'avgst_max',
} as const

export function messageServiceSenders(handlerUrl: string) {
  return (Object.keys(messageSenderCodes) as MessengerChannel[]).map(channel => ({
    CODE: messageSenderCodes[channel],
    TYPE: 'SMS',
    HANDLER: handlerUrl,
    NAME: lineChannelName(channel),
    DESCRIPTION: `Исходящие ${messengerTitles[channel]} через ${connectorName}`,
  }))
}

export function channelFromSenderCode(code: string): MessengerChannel | '' {
  const entry = (Object.entries(messageSenderCodes) as [MessengerChannel, string][])
    .find(([, value]) => value === code)
  return entry?.[0] || ''
}

export function parseCrmMessageSend(body: Record<string, unknown>) {
  const code = String(body.code || record(body.properties).code || '').trim()
  const channel = channelFromSenderCode(code)
  if (!channel) return null
  const properties = record(body.properties)
  const messageId = String(body.message_id || body.MESSAGE_ID || '').trim()
  const phone = String(body.message_to || properties.phone_number || '').trim()
  const text = String(body.message_body || properties.message_text || '').trim()
  if (!messageId || !phone || !text) return null
  return { code, channel, messageId, phone, text }
}

export function parseBitrixBody(contentType: string | null, text: string): Record<string, unknown> {
  if (!text) return {}
  if (contentType?.includes('application/json')) return JSON.parse(text) as Record<string, unknown>
  const root: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(text)) assign(root, key.replace(/\]/g, '').split('['), value)
  return root
}

function assign(cursor: Record<string, unknown> | unknown[], parts: string[], value: string) {
  if (parts.length > 16 || parts.some(part => ['__proto__', 'constructor', 'prototype'].includes(part))) return
  const [head, ...rest] = parts
  if (Array.isArray(cursor) && (!/^\d{1,4}$/.test(head) || Number(head) > 1024)) return
  if (!rest.length) {
    if (Array.isArray(cursor)) cursor[Number(head)] = value
    else cursor[head] = value
    return
  }
  const nextIsIndex = /^\d+$/.test(rest[0])
  const current = Array.isArray(cursor) ? cursor[Number(head)] : cursor[head]
  const child = current && typeof current === 'object' ? current as Record<string, unknown> : (nextIsIndex ? [] : {})
  if (Array.isArray(cursor)) cursor[Number(head)] = child
  else cursor[head] = child
  assign(child as Record<string, unknown>, rest, value)
}

export type BitrixAuth = {
  domain: string
  accessToken: string
  refreshToken: string
  memberId: string
  applicationToken: string
  expiresAt: number
}

export function bitrixAuth(body: Record<string, unknown>): BitrixAuth {
  const auth = record(body.auth)
  const domain = String(auth.domain || body.DOMAIN || '').toLowerCase()
  const expiresIn = Number(auth.expires_in || body.AUTH_EXPIRES || 3600)
  return {
    domain,
    accessToken: String(auth.access_token || body.AUTH_ID || ''),
    refreshToken: String(auth.refresh_token || body.REFRESH_ID || ''),
    memberId: String(auth.member_id || body.member_id || ''),
    applicationToken: String(auth.application_token || body.application_token || ''),
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  }
}

export function placementLine(body: Record<string, unknown>) {
  const raw = body.PLACEMENT_OPTIONS || record(body.auth).PLACEMENT_OPTIONS
  const options = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : record(raw)
  const line = Number(options.LINE)
  return { connector: String(options.CONNECTOR || ''), line: Number.isInteger(line) ? line : 0 }
}

export function messageRows(body: Record<string, unknown>) {
  const data = record(body.data)
  const messages = Array.isArray(data.MESSAGES) ? data.MESSAGES : []
  return messages.map(item => {
    const row = record(item)
    const im = record(row.im)
    const message = record(row.message)
    const chat = record(row.chat)
    return {
      line: String(data.LINE || ''),
      chatId: String(chat.id || ''),
      text: String(message.text || ''),
      bitrixMessageId: String(im.message_id || ''),
      userId: String(message.user_id || ''),
    }
  }).filter(row => row.bitrixMessageId && row.chatId)
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export const messengerChannelNames = { max: 'MAX', telegram: 'Telegram', whatsapp: 'WhatsApp' } as const
const dialogBrand = { max: 'AM.MAX', telegram: 'AM.Telegram', whatsapp: 'AM.WhatsApp' } as const

// Подпись диалога: @юзернейм, иначе имя, иначе телефон, затем AM.WhatsApp / AM.Telegram / AM.MAX.
export function messengerSession(channel: string, phone: string, messageId: string, text: string, person: { name?: string, username?: string, peer?: string } = {}) {
  const brand = dialogBrand[channel as keyof typeof dialogBrand]
  const digits = phone.replace(/\D/g, '')
  const national = digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits
  const readable = national.length >= 10 ? `+${national}` : ''
  const username = (person.username || '').trim().replace(/^@/, '')
  const safeUsername = /^[A-Za-z0-9_]{3,32}$/.test(username) ? username : ''
  const personName = (person.name || '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const peer = person.peer && /^[A-Za-z0-9@._:-]{1,100}$/.test(person.peer) ? person.peer : ''
  const who = safeUsername ? `@${safeUsername}` : personName || readable || (peer ? 'Клиент' : '')
  if (!brand || !who || !messageId || !text) return null
  if (!readable && !safeUsername && !peer) return null
  const id = peer ? `${channel}:peer:${peer}` : readable ? `${channel}:${national}` : `${channel}:@${safeUsername}`
  const user: { id: string, name: string, phone?: string } = { id, name: who }
  if (readable) user.phone = readable
  return {
    user,
    message: { id: messageId, date: Math.floor(Date.now() / 1000), text },
    chat: { id, name: `${who} - ${brand}`, url: 'https://avgst.ru' },
  }
}

export async function refreshMessengerAuth(refreshToken: string, request: typeof fetch = fetch) {
  const clientId = process.env.BITRIX_APP_CLIENT_ID || ''
  const clientSecret = process.env.BITRIX_APP_CLIENT_SECRET || ''
  if (!clientId || !clientSecret || !refreshToken) return null
  const response = await request('https://oauth.bitrix24.tech/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  })
  const body = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number }
  if (!response.ok || !body.access_token) return null
  return { accessToken: body.access_token, refreshToken: body.refresh_token || refreshToken, expiresAt: Date.now() + Number(body.expires_in || 3600) * 1000 }
}

export async function bitrixCall<T>(domain: string, token: string, method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (domain !== portalDomain) throw new Error('Неверный портал')
  if (!/^[a-z0-9.]+$/i.test(method)) throw new Error('Недопустимый метод')
  const response = await fetch(`https://${domain}/rest/${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, auth: token }),
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  })
  const body = await response.json() as { result?: T; error?: string; error_description?: string }
  if (!response.ok || body.error) {
    const detail = `${body.error || ''} ${body.error_description || ''}`.toLowerCase()
    const already = detail.includes('already') || detail.includes('exists')
    if (already && (method === 'imconnector.register' || method === 'event.bind' || method === 'messageservice.sender.add')) return true as T
    throw new Error(body.error || String(response.status))
  }
  return body.result as T
}
