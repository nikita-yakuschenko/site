import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, type WASocket } from '@whiskeysockets/baileys'
import { createRequire } from 'node:module'
import { nationalPhone } from './phone'

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }
const quiet = { level: 'silent', child() { return quiet }, trace() {}, debug() {}, info() {}, warn() {}, error() {} }

export type LinkHandle = { send: (address: string, text: string) => Promise<void>, stop: () => Promise<void> }
export type LinkHooks = {
  onQr: (image: string) => void
  onConnected: (phone: string) => void
  onMessage: (phone: string, text: string) => void
  onSaved: () => void
  onError: (hint: string) => void
}

export async function startWhatsApp(directory: string, hooks: LinkHooks): Promise<LinkHandle> {
  let stopped = false
  let attempt = 0
  let current: WASocket | null = null
  const open = async () => {
    if (stopped) return
    const { state, saveCreds } = await useMultiFileAuthState(directory)
    const { version } = await fetchLatestBaileysVersion()
    const socket = makeWASocket({ version, auth: state, logger: quiet as never, printQRInTerminal: false, browser: Browsers.macOS('Desktop'), syncFullHistory: false, markOnlineOnConnect: false, shouldSyncHistoryMessage: () => false })
    current = socket
    socket.ev.on('creds.update', async () => { await saveCreds(); hooks.onSaved() })
    socket.ev.on('connection.update', update => {
      if (update.qr) void qrCode.toDataURL(update.qr).then(hooks.onQr)
      if (update.connection === 'open') {
        attempt = 0
        hooks.onConnected(nationalPhone((socket.user?.id || '').split('@')[0].split(':')[0]))
        hooks.onSaved()
      }
      if (update.connection === 'close' && !stopped) {
        const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
        if (code === DisconnectReason.loggedOut) { hooks.onError('logged-out'); return }
        if (attempt++ < 5) setTimeout(() => void open(), 500)
        else hooks.onError('closed')
      }
    })
    socket.ev.on('messages.upsert', event => {
      if (event.type !== 'notify') return
      for (const item of event.messages) {
        if (item.key.fromMe) continue
        const jid = item.key.remoteJid || ''
        if (!jid.endsWith('@s.whatsapp.net')) continue
        const text = item.message?.conversation || item.message?.extendedTextMessage?.text || ''
        const phone = nationalPhone(jid)
        if (phone && text) hooks.onMessage(phone, text)
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
    stop: async () => { stopped = true; current?.end(undefined) },
  }
}
