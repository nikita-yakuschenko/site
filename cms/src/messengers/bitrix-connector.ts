// Видимое имя канала в Битрикс24. Оба слова с большой буквы.
export const connectorName = 'Avangard Messengers'
export const connectorId = 'avangard_messengers'
export const publisherName = 'Avangard Web Platform'
export const portalDomain = 'avgstroy.bitrix24.ru'

function icon(color: string) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 3 3 10.2V21h6.2v-6.3h5.6V21H21V10.2z"/></svg>'
  return { DATA_IMAGE: `data:image/svg+xml,${encodeURIComponent(svg)}`, COLOR: color, SIZE: '80%', POSITION: 'center' }
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

export function parseBitrixBody(contentType: string | null, text: string): Record<string, unknown> {
  if (!text) return {}
  if (contentType?.includes('application/json')) return JSON.parse(text) as Record<string, unknown>
  const root: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(text)) assign(root, key.replace(/\]/g, '').split('['), value)
  return root
}

function assign(cursor: Record<string, unknown> | unknown[], parts: string[], value: string) {
  const [head, ...rest] = parts
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
    const already = String(body.error_description || '').toLowerCase().includes('already')
    if (already) return true as T
    throw new Error(body.error || String(response.status))
  }
  return body.result as T
}
