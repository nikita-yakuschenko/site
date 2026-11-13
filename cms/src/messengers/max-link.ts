import { createRequire } from 'node:module'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { nationalPhone } from './phone'
import type { LinkHandle, LinkHooks } from './whatsapp-link'

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }
const { WebMaxClient } = require('webmaxsocket') as {
  WebMaxClient: new (options: { name: string, deviceType: string, logIncoming: false, maxReconnectAttempts: number }) => MaxClient
}
const libraryName = 'avgst-max'
const loginByQrOpcode = 291
const checkPasswordOpcode = 0x73

type MaxClient = {
  connect: () => Promise<void>
  start: () => Promise<void>
  requestQR: () => Promise<{ qrLink?: string, trackId?: string, pollingInterval?: number, expiresAt?: number }>
  pollQRStatus: (trackId: string, pollingInterval: number, expiresAt: number) => Promise<unknown>
  loginByQR: (trackId: string) => Promise<Record<string, unknown>>
  sendAndWait: (opcode: number, payload?: unknown) => Promise<{ payload?: Record<string, unknown> }>
  sync: () => Promise<void>
  stop: () => Promise<void>
  handleReconnect: () => void
  session: { set: (key: string, value: unknown) => void }
  deviceId: string
  userAgent: { headerUserAgent?: string, appVersion?: string, osVersion?: string, deviceName?: string, screen?: string, timezone?: string, locale?: string, buildNumber?: number, clientSessionId?: number }
  isAuthorized: boolean
  isConnected: boolean
  me: { id?: string | number, phone?: string } | null
  onMessage: (handler: (message: { id?: string | number, text?: string, senderId?: string | number, chatId?: string | number, sender?: { id?: string | number, phone?: string, username?: string | null, firstname?: string, lastname?: string, fullname?: string } }) => void) => void
  sendMessage: (options: { chatId: string | number, text: string }) => Promise<unknown>
  getUserByPhone: (phone: string) => Promise<{ id: string | number } | null>
}

export async function startMax(directory: string, hooks: LinkHooks): Promise<LinkHandle> {
  const libraryFile = path.join(process.cwd(), 'sessions', `${libraryName}.json`)
  const stored = path.join(directory, 'session.json')
  await mkdir(path.dirname(libraryFile), { recursive: true })
  await rm(libraryFile, { force: true })
  await copyFile(stored, libraryFile).catch(error => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  })
  const client = new WebMaxClient({ name: libraryName, deviceType: 'WEB', logIncoming: false, maxReconnectAttempts: 0 })
  client.handleReconnect = () => undefined
  let stopped = false
  const finish = async () => {
    await copyFile(libraryFile, stored).catch(() => undefined)
    hooks.onSaved()
    hooks.onConnected(nationalPhone(String(client.me?.phone || '')))
    client.onMessage(message => {
      if (message.senderId && client.me?.id && String(message.senderId) === String(client.me.id)) return
      const sender = message.sender
      const phone = nationalPhone(String(sender?.phone || ''))
      const name = String(sender?.fullname || [sender?.firstname, sender?.lastname].filter(Boolean).join(' ') || '').trim()
      const peer = String(message.chatId ?? '')
      if (!stopped && /^-?\d+$/.test(peer) && message.text) hooks.onMessage(phone, message.text, { name, username: sender?.username || '', peer }, message.id == null ? undefined : `${peer}:${message.id}`)
    })
  }
  if (await hasToken(libraryFile)) await client.start().then(finish)
  else {
    await client.connect()
    const qr = await client.requestQR()
    if (!qr.qrLink || !qr.trackId || !qr.pollingInterval || !qr.expiresAt) throw new Error('MAX не выдал код для входа')
    hooks.onQr(await qrCode.toDataURL(qr.qrLink))
    const trackId = qr.trackId
    const pollingInterval = qr.pollingInterval
    const expiresAt = qr.expiresAt
    void client.pollQRStatus(trackId, pollingInterval, expiresAt).then(async () => {
      if (stopped) return
      // После loginAvailable серверу нужна короткая пауза, иначе LOGIN_BY_QR часто пустой.
      await sleep(500)
      if (stopped) return
      console.error('max-link login-by-qr start')
      let login = await loginAfterScan(client, trackId)
      if (stopped) return
      login = await resolvePasswordChallenge(client, login, hooks)
      if (stopped) return
      const token = readLoginToken(login)
      if (!token) {
        console.error(`max-link login-by-qr empty-token keys=${describeKeys(login)}`)
        throw new Error('MAX не вернул токен после скана. Нажмите «Подключить» и отсканируйте новый код сразу.')
      }
      applySessionToken(client, token)
      await client.sync()
      console.error('max-link login-by-qr ok')
      await finish()
    }).catch(error => {
      const message = error instanceof Error ? error.message : 'MAX не подтвердил вход'
      console.error(`max-link login-by-qr fail ${message.slice(0, 240)}`)
      hooks.onError(message.slice(0, 240))
    })
  }
  return {
    send: async (address, text) => {
      if (!client.isAuthorized) throw new Error('MAX ещё не подключён')
      if (/^peer:-?\d+$/.test(address)) {
        await client.sendMessage({ chatId: address.slice(5), text })
        return
      }
      const phone = nationalPhone(address)
      const user = phone ? await client.getUserByPhone(`+${phone}`) : null
      const chatId = user?.id
      if (!chatId) throw new Error('В MAX нет пользователя с этим номером')
      await client.sendMessage({ chatId, text })
    },
    lookup: async phone => {
      if (!client.isAuthorized) throw new Error('MAX не подключён')
      const national = nationalPhone(phone)
      if (!national) throw new Error('Некорректный номер')
      const user = await client.getUserByPhone(`+${national}`)
      return user?.id != null ? 'found' : 'missing'
    },
    stop: async () => {
      stopped = true
      client.handleReconnect = () => undefined
      await client.stop()
      await rm(libraryFile, { force: true })
    },
  }
}

async function loginAfterScan(client: MaxClient, trackId: string) {
  try {
    return await loginWithPayloads(client, trackId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`max-link login-by-qr retry ${message.slice(0, 160)}`)
    if (!client.isConnected) await client.connect()
    await sleep(400)
    return loginWithPayloads(client, trackId)
  }
}

async function loginWithPayloads(client: MaxClient, trackId: string) {
  const id = String(trackId).trim()
  const payloads: Record<string, unknown>[] = id.startsWith('qr_')
    ? [{ token: id }]
    : [{ trackId: id }, { track: id }, { authTrackId: id }]
  let lastError: Error | undefined
  for (const payload of payloads) {
    try {
      const response = await client.sendAndWait(loginByQrOpcode, payload)
      const body = response.payload || {}
      if (body.error) {
        const text = errorText(body.error) || body.localizedMessage || JSON.stringify(body.error)
        lastError = new Error(String(text))
        if (/track\.not\.found/i.test(String(text))) throw lastError
        if (/proto\.payload/i.test(String(text))) continue
        continue
      }
      if (readLoginToken(body) || body.passwordChallenge != null) return body
      lastError = new Error('Пустой ответ LOGIN_BY_QR')
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (/track\.not\.found/i.test(lastError.message)) throw lastError
    }
  }
  // Последний шанс — штатный метод библиотеки.
  try {
    return await client.loginByQR(trackId)
  } catch (error) {
    throw lastError || (error instanceof Error ? error : new Error('LOGIN_BY_QR не удался'))
  }
}

async function resolvePasswordChallenge(client: MaxClient, login: Record<string, unknown>, hooks: LinkHooks) {
  const challenge = login.passwordChallenge
  if (challenge == null) return login
  const row = challenge && typeof challenge === 'object' ? challenge as Record<string, unknown> : {}
  const trackId = String(row.trackId || row.track_id || '').trim()
  if (!trackId) throw new Error('MAX просит пароль двухэтапной защиты, но не передал trackId.')
  if (!hooks.password) throw new Error('MAX просит пароль двухэтапной защиты. Введите его в форме подключения.')
  const password = String(await hooks.password()).trim()
  if (!password) throw new Error('Пароль двухэтапной защиты пуст.')
  const response = await client.sendAndWait(checkPasswordOpcode, { trackId, password })
  const body = response.payload || {}
  if (body.error) throw new Error(errorText(body.error) || 'MAX не принял пароль двухэтапной защиты')
  return body
}

function applySessionToken(client: MaxClient, token: string) {
  const agent = client.userAgent
  client.session.set('token', token)
  client.session.set('deviceId', client.deviceId)
  client.session.set('clientSessionId', agent.clientSessionId)
  client.session.set('deviceType', 'ANDROID')
  client.session.set('headerUserAgent', agent.headerUserAgent)
  client.session.set('appVersion', agent.appVersion)
  client.session.set('osVersion', agent.osVersion)
  client.session.set('deviceName', agent.deviceName)
  client.session.set('screen', agent.screen)
  client.session.set('timezone', agent.timezone)
  client.session.set('locale', agent.locale)
  client.session.set('buildNumber', agent.buildNumber)
  ;(client as MaxClient & { _token?: string })._token = token
  client.isAuthorized = true
}

function readLoginToken(login: unknown) {
  const found = new Set<string>()
  const walk = (value: unknown, depth: number) => {
    if (depth > 12 || value == null) return
    if (typeof value !== 'object') return
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1)
      return
    }
    const row = value as Record<string, unknown>
    const attrs = row.tokenAttrs
    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      const loginAttrs = (attrs as { LOGIN?: unknown }).LOGIN
      if (loginAttrs && typeof loginAttrs === 'object' && !Array.isArray(loginAttrs)) {
        const token = (loginAttrs as { token?: unknown }).token
        if (typeof token === 'string' && token.trim()) found.add(token.trim())
      }
    }
    if (typeof row.token === 'string' && row.token.trim() && depth > 0) found.add(row.token.trim())
    for (const child of Object.values(row)) walk(child, depth + 1)
  }
  walk(login, 0)
  return [...found][0] || ''
}

function errorText(error: unknown) {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return String((error as { message: string }).message)
  }
  return ''
}

function describeKeys(value: unknown) {
  if (!value || typeof value !== 'object') return typeof value
  return Object.keys(value).join(',') || '(empty)'
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function hasToken(file: string) {
  try { return Boolean(JSON.parse(await readFile(file, 'utf8')).token) } catch { return false }
}
