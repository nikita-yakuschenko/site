import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys'
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
  onMessage: (phone: string, text: string, person?: { name?: string, username?: string }) => void
  onSaved: () => void
  onError: (hint: string) => void
  onHint?: (hint: string) => void
}

export async function startWhatsApp(directory: string, hooks: LinkHooks): Promise<LinkHandle> {
  let stopped = false
  let attempt = 0
  let current: WASocket | null = null
  let waiting: ReturnType<typeof setTimeout> | undefined
  const open = async () => {
    if (stopped) return
    clearTimeout(waiting)
    waiting = setTimeout(() => hooks.onHint?.('Код ещё не пришёл: сервер не достучался до WhatsApp.'), 12000)
    const { state, saveCreds } = await useMultiFileAuthState(directory)
    const socket = makeWASocket({ auth: state, logger: quiet as never, browser: Browsers.macOS('Chrome'), connectTimeoutMs: 10000, syncFullHistory: false, markOnlineOnConnect: false, shouldSyncHistoryMessage: () => false })
    current = socket
    // В этой версии Baileys события приходят одним пакетом, отдельные on('connection.update') не вызываются.
    socket.ev.process(async events => {
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
          setTimeout(() => void open(), 500)
        } else hooks.onError('Сервер не соединился с WhatsApp. Код входа не пришёл.')
      }
      const upsert = events['messages.upsert']
      if (!upsert || upsert.type !== 'notify') return
      for (const item of upsert.messages) {
        if (item.key.fromMe) continue
        const jid = item.key.remoteJid || ''
        if (!jid.endsWith('@s.whatsapp.net')) continue
        const text = item.message?.conversation || item.message?.extendedTextMessage?.text || ''
        const phone = nationalPhone(jid)
        const pushName = (item.pushName || '').trim()
        const name = pushName && nationalPhone(pushName) !== phone ? pushName : ''
        if (phone && text) hooks.onMessage(phone, text, { name })
      }
    })
  }
  await open()
  return {
    send: async (address, text) => {
      const phone = nationalPhone(address)
      if (!current || !phone) throw new Error('WhatsApp ещё не подключён')
      await current.sendMessage(`${phone}@s.whatsapp.net`, { text })
    },
    stop: async () => { stopped = true; clearTimeout(waiting); current?.end(undefined) },
  }
}
