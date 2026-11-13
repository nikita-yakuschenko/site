import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState as loadAuthState, type WASocket } from '@whiskeysockets/baileys'
import { Agent as HttpsAgent } from 'node:https'
import { createRequire } from 'node:module'
import { setDefaultResultOrder } from 'node:dns'
import { nationalPhone } from './phone'

// В контейнере IPv6 до WhatsApp часто молчит, и код входа не появляется. Сначала берём IPv4.
setDefaultResultOrder('ipv4first')

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }
const quiet = { level: 'silent', child() { return quiet }, trace() {}, debug() {}, info() {}, warn() {}, error() {} }

export type LinkHandle = { send: (address: string, text: string) => Promise<void>, stop: () => Promise<void> }
export type LinkHooks = {
  onQr: (image: string) => void
  onConnected: (phone: string) => void
  onMessage: (phone: string, text: string, person?: { name?: string, username?: string, peer?: string }, externalId?: string) => void
  onSaved: () => void
  onError: (hint: string) => void
  onHint?: (hint: string) => void
}

export async function startWhatsApp(directory: string, hooks: LinkHooks): Promise<LinkHandle> {
  let stopped = false
  let attempt = 0
  let current: WASocket | null = null
  let waiting: ReturnType<typeof setTimeout> | undefined
  const agent = new HttpsAgent({ family: 4, keepAlive: true, timeout: 15000 })
  const open = async () => {
    if (stopped) return
    clearTimeout(waiting)
    waiting = setTimeout(() => hooks.onHint?.('WhatsApp не отвечает. Ждём код ещё несколько секунд.'), 8000)
    const { state, saveCreds } = await loadAuthState(directory)
    const socket = makeWASocket({
      auth: { ...state, keys: { ...state.keys, set: async data => {
        await state.keys.set(data)
        if (!stopped) hooks.onSaved()
      } } },
      logger: quiet as never,
      browser: Browsers.macOS('Chrome'),
      agent,
      connectTimeoutMs: 20000,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      shouldSyncHistoryMessage: () => false,
    })
    current = socket
    socket.ev.process(async events => {
      if (stopped || socket !== current) return
      if (events['creds.update']) { await saveCreds(); hooks.onSaved() }
      const update = events['connection.update']
      if (update?.qr) {
        clearTimeout(waiting)
        try { hooks.onQr(await qrCode.toDataURL(update.qr)) } catch { hooks.onError('Не удалось нарисовать код') }
      }
      if (update?.connection === 'open') {
        clearTimeout(waiting)
        attempt = 0
        hooks.onConnected(nationalPhone((socket.user?.id || '').split('@')[0].split(':')[0]))
        hooks.onSaved()
      }
      if (update?.connection === 'close' && !stopped) {
        const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
        const detail = update.lastDisconnect?.error instanceof Error ? update.lastDisconnect.error.message : ''
        console.error(`whatsapp-link close ${code || 'unknown'} ${detail.slice(0, 140)}`)
        if (code === DisconnectReason.loggedOut) { hooks.onError('logged-out'); return }
        if (attempt++ < 1) {
          hooks.onHint?.('Связь с WhatsApp прервалась, повторяем.')
          setTimeout(() => void open().catch(() => {
            if (!stopped) hooks.onError('Не удалось восстановить соединение WhatsApp')
          }), 800)
          return
        }
        clearTimeout(waiting)
        hooks.onError('Сервер не достучался до WhatsApp: соединение обрывается. Нужен исходящий доступ с CMS до web.whatsapp.com.')
      }
      const upsert = events['messages.upsert']
      if (!upsert || upsert.type !== 'notify') return
      for (const item of upsert.messages) {
        if (item.key.fromMe) continue
        const primary = item.key.remoteJid || ''
        const jid = primary.endsWith('@lid') ? item.key.remoteJidAlt || '' : primary
        const lid = /^\d+@lid$/.test(primary) ? primary : ''
        if (!jid.endsWith('@s.whatsapp.net') && !lid) continue
        const text = item.message?.conversation || item.message?.extendedTextMessage?.text || ''
        const phone = jid.endsWith('@s.whatsapp.net') ? nationalPhone(jid.split('@')[0].split(':')[0]) : ''
        const pushName = (item.pushName || '').trim()
        const name = pushName && nationalPhone(pushName) !== phone ? pushName : ''
        if ((phone || lid) && text) hooks.onMessage(phone, text, { name, peer: lid }, item.key.id ? item.key.id : undefined)
      }
    })
  }
  await open()
  return {
    send: async (address, text) => {
      const phone = address.startsWith('peer:') ? '' : nationalPhone(address)
      const jid = /^peer:\d+@lid$/.test(address) ? address.slice(5) : phone ? `${phone}@s.whatsapp.net` : ''
      if (!current || !jid) throw new Error('WhatsApp не подключён или адрес недействителен')
      await current.sendMessage(jid, { text })
    },
    stop: async () => { stopped = true; clearTimeout(waiting); current?.end(undefined) },
  }
}
