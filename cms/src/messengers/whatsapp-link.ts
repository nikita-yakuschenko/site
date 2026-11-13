import makeWASocket, { Browsers, DisconnectReason, jidNormalizedUser, useMultiFileAuthState as loadAuthState, type WASocket } from '@whiskeysockets/baileys'
import { Agent as HttpsAgent } from 'node:https'
import { createRequire } from 'node:module'
import { lookup, setDefaultResultOrder } from 'node:dns'
import { isIPv4 } from 'node:net'
import { connect as connectTls, type ConnectionOptions } from 'node:tls'
import { randomUUID } from 'node:crypto'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { nationalPhone } from './phone'

// В контейнере IPv6 до WhatsApp часто молчит, и код входа не появляется. Сначала берём IPv4.
setDefaultResultOrder('ipv4first')

const require = createRequire(import.meta.url)
const qrCode = require('qrcode') as { toDataURL: (text: string) => Promise<string> }
const quiet = { level: 'silent', child() { return quiet }, trace() {}, debug() {}, info() {}, warn() {}, error() {} }

export type ContactLookup = 'found' | 'missing'
export type LinkHandle = {
  send: (address: string, text: string) => Promise<void>
  stop: () => Promise<void>
  // Есть ли аккаунт с этим номером в мессенджере. Без отправки сообщений.
  lookup?: (phone: string) => Promise<ContactLookup>
  peerForPhone?: (phone: string) => Promise<string | null>
}
export type LinkHooks = {
  onQr: (image: string) => void
  onConnected: (phone: string) => void
  onMessage: (phone: string, text: string, person?: { name?: string, username?: string, peer?: string }, externalId?: string) => void
  onSaved: () => void
  onError: (hint: string) => void
  onHint?: (hint: string) => void
  password?: () => Promise<string>
}

export async function startWhatsApp(directory: string, hooks: LinkHooks): Promise<LinkHandle> {
  let stopped = false
  let attempt = 0
  let current: WASocket | null = null
  let waiting: ReturnType<typeof setTimeout> | undefined
  const connectionId = randomUUID()
  let sequence = 0
  // Keep DNS as the first choice. The CMS route to some WhatsApp IPv4 edges times out.
  const fallback = process.env.WHATSAPP_FALLBACK_IPV4 ?? '163.70.151.60'
  const proxySetting = process.env.WHATSAPP_PROXY_URL?.trim()
  let proxyAgent: HttpsProxyAgent<string> | undefined
  if (proxySetting) {
    try {
      const url = new URL(proxySetting)
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.pathname !== '/' || url.search || url.hash) throw new Error()
      proxyAgent = new HttpsProxyAgent(url, { timeout: 15000 })
      proxyAgent.on('proxyConnect', (response: { statusCode?: number }) => diagnostic('proxy-connect', { status: response.statusCode }))
    } catch {
      throw new Error('WHATSAPP_PROXY_URL должен содержать адрес HTTP или HTTPS прокси')
    }
  }
  const diagnostic = (stage: string, fields: Record<string, unknown> = {}) => {
    console.info(JSON.stringify({ component: 'whatsapp-link', connectionId, attempt: sequence, stage, ...fields }))
  }
  function traceSocket(options: ConnectionOptions) {
    const attemptNumber = sequence
    const started = Date.now()
    const socket = connectTls(options)
    let phase = 'tcp'
    const log = (stage: string, fields: Record<string, unknown> = {}) => {
      diagnostic(stage, { attempt: attemptNumber, elapsedMs: Date.now() - started, ...fields })
    }
    socket.once('connect', () => {
      phase = 'tls'
      log('tcp-connected', { address: socket.remoteAddress })
    })
    socket.once('secureConnect', () => {
      phase = 'http-upgrade'
      log('tls-connected', { protocol: socket.getProtocol() })
    })
    socket.once('close', hadError => log('transport-closed', { phase, hadError }))
    return socket
  }
  const directAgent = new HttpsAgent({ family: 4, keepAlive: true, timeout: 15000, lookup: (hostname, options, callback) => {
    lookup(hostname, { ...options, all: true }, (error, addresses) => {
      diagnostic('dns', { route: 'dns', addresses: addresses?.map(entry => entry.address), error: error?.code })
      if (options.all) callback(error, addresses)
      else callback(error, addresses?.[0]?.address ?? '', addresses?.[0]?.family ?? 4)
    })
  } })
  const fallbackAgent = isIPv4(fallback) ? new HttpsAgent({
    family: 4,
    timeout: 15000,
    lookup: (hostname, options, callback) => {
      if (hostname !== 'web.whatsapp.com') {
        callback(new Error('Unexpected WhatsApp WebSocket host'), '', 4)
        return
      }
      diagnostic('dns', { route: 'fallback', addresses: [fallback] })
      if (options.all) callback(null, [{ address: fallback, family: 4 }])
      else callback(null, fallback, 4)
    },
  }) : directAgent
  directAgent.createConnection = traceSocket
  if (fallbackAgent !== directAgent) fallbackAgent.createConnection = traceSocket
  const open = async () => {
    if (stopped) return
    sequence += 1
    const started = Date.now()
    let lastStage = 'loading-auth'
    const stage = (name: string, fields: Record<string, unknown> = {}) => {
      lastStage = name
      diagnostic(name, { elapsedMs: Date.now() - started, ...fields })
    }
    clearTimeout(waiting)
    waiting = setTimeout(() => hooks.onHint?.('WhatsApp не отвечает. Ждём код ещё несколько секунд.'), 8000)
    const { state, saveCreds } = await loadAuthState(directory)
    const agent = proxyAgent ?? (attempt > 0 ? fallbackAgent : directAgent)
    stage('connecting', { route: proxyAgent ? 'proxy' : agent === directAgent ? 'dns' : 'fallback', timeoutMs: 20000, registered: Boolean(state.creds.registered) })
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
    socket.ws.on('upgrade', (response: { statusCode?: number }) => stage('http-upgrade', { status: response.statusCode }))
    socket.ws.on('open', () => stage('websocket-open'))
    socket.ws.on('frame', () => {
      if (lastStage === 'websocket-open') stage('first-protocol-frame')
    })
    socket.ev.process(async events => {
      if (stopped || socket !== current) return
      if (events['creds.update']) { await saveCreds(); hooks.onSaved() }
      const update = events['connection.update']
      if (update?.qr) {
        if (lastStage !== 'qr-received' && lastStage !== 'qr-rendered') stage('qr-received')
        clearTimeout(waiting)
        try {
          const image = await qrCode.toDataURL(update.qr)
          if (lastStage !== 'qr-rendered') stage('qr-rendered')
          hooks.onQr(image)
        } catch {
          stage('qr-render-failed')
          hooks.onError('Не удалось нарисовать код')
        }
      }
      if (update?.connection === 'open') {
        stage('account-connected')
        clearTimeout(waiting)
        attempt = 0
        hooks.onConnected(nationalPhone((socket.user?.id || '').split('@')[0].split(':')[0]))
        hooks.onSaved()
      }
      if (update?.connection === 'close' && !stopped) {
        const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode
        const error = update.lastDisconnect?.error as (Error & { code?: string }) | undefined
        const reason = error?.message === 'WebSocket Error (Opening handshake has timed out)' ? 'websocket-handshake-timeout' : undefined
        stage('closed', { previousStage: lastStage, status: code, reason, networkCode: /^[A-Z0-9_]{1,40}$/.test(error?.code ?? '') ? error?.code : undefined })
        if (code === DisconnectReason.loggedOut) { hooks.onError('logged-out'); return }
        if (attempt++ < 1) {
          diagnostic('retry-scheduled', { delayMs: 800, route: proxyAgent ? 'proxy' : fallbackAgent === directAgent ? 'dns' : 'fallback' })
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
      // notify — живые сообщения; append иногда приходит вместо notify после восстановления сессии.
      if (!upsert || (upsert.type !== 'notify' && upsert.type !== 'append')) return
      for (const item of upsert.messages) {
        if (item.key.fromMe) continue
        if (upsert.type === 'append') {
          const stamp = Number(item.messageTimestamp || 0) * 1000
          if (!stamp || Date.now() - stamp > 120_000) continue
        }
        const primary = item.key.remoteJid || ''
        const alternate = item.key.remoteJidAlt || ''
        const lid = [primary, alternate].map(jidNormalizedUser).find(value => /^\d+@lid$/.test(value)) || ''
        let jid = primary.endsWith('@lid') ? item.key.remoteJidAlt || '' : primary
        if (lid && !jid.endsWith('@s.whatsapp.net')) {
          jid = await socket.signalRepository.lidMapping.getPNForLID(lid).catch(() => null) || ''
        }
        if (!jid.endsWith('@s.whatsapp.net') && !lid) continue
        const text = item.message?.conversation || item.message?.extendedTextMessage?.text || ''
        const phone = jid.endsWith('@s.whatsapp.net') ? nationalPhone(jid.split('@')[0].split(':')[0]) : ''
        const pushName = (item.pushName || '').trim()
        const name = pushName && nationalPhone(pushName) !== phone ? pushName : ''
        if ((phone || lid) && text) hooks.onMessage(phone, text, { name, peer: lid || undefined }, item.key.id ? item.key.id : undefined)
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
    peerForPhone: async phone => {
      if (!current) return null
      const lid = await current.signalRepository.lidMapping.getLIDForPN(`${phone}@s.whatsapp.net`).catch(() => null)
      return lid ? jidNormalizedUser(lid) : null
    },
    lookup: async phone => {
      const national = nationalPhone(phone)
      if (!current || !national) throw new Error('WhatsApp не подключён')
      const rows = await current.onWhatsApp(`${national}@s.whatsapp.net`)
      return (rows || []).some(row => row.exists) ? 'found' : 'missing'
    },
    stop: async () => {
      stopped = true
      clearTimeout(waiting)
      current?.end(undefined)
      directAgent.destroy()
      proxyAgent?.destroy()
      if (fallbackAgent !== directAgent) fallbackAgent.destroy()
    },
  }
}
