import { createRequire } from 'node:module'
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { nationalPhone } from './phone'
import type { LinkHandle, LinkHooks } from './whatsapp-link'

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }
const { WebMaxClient } = require('webmaxsocket') as { WebMaxClient: new (options: { name: string, deviceType: string, logIncoming: false, maxReconnectAttempts: number }) => MaxClient }
const libraryName = 'avgst-max'

type MaxClient = {
  connect: () => Promise<void>
  start: () => Promise<void>
  requestQR: () => Promise<{ qrLink?: string, trackId?: string, pollingInterval?: number, expiresAt?: number }>
  pollQRStatus: (trackId: string, pollingInterval: number, expiresAt: number) => Promise<unknown>
  loginByQR: (trackId: string) => Promise<{ tokenAttrs?: { LOGIN?: { token?: string } } }>
  sync: () => Promise<void>
  stop: () => Promise<void>
  session: { set: (key: string, value: unknown) => void }
  deviceId: string
  userAgent: { headerUserAgent?: string, appVersion?: string, osVersion?: string, deviceName?: string, screen?: string, timezone?: string, locale?: string, buildNumber?: number, clientSessionId?: number }
  isAuthorized: boolean
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
    if (error.code !== 'ENOENT') throw error
  })
  const client = new WebMaxClient({ name: libraryName, deviceType: 'WEB', logIncoming: false, maxReconnectAttempts: 0 })
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
      const login = await client.loginByQR(trackId)
      if (stopped) return
      const token = login.tokenAttrs?.LOGIN?.token
      if (!token) throw new Error('MAX не подтвердил вход')
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
      client.isAuthorized = true
      await client.sync()
      await finish()
    }).catch(error => hooks.onError(error instanceof Error ? error.message : 'MAX не подтвердил вход'))
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
    stop: async () => { stopped = true; await client.stop(); await rm(libraryFile, { force: true }) },
  }
}

async function hasToken(file: string) {
  try { return Boolean(JSON.parse(await readFile(file, 'utf8')).token) } catch { return false }
}
