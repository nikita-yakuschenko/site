import { createHmac, timingSafeEqual } from 'node:crypto'
import type { InboundFile } from './whatsapp-link'

function signature(key: string, expires: number) {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is missing')
  return createHmac('sha256', secret).update(JSON.stringify(['messenger-file', key, expires])).digest('hex')
}

export function readInboundFile(data: Record<string, unknown>) {
  const file = data.file as Partial<InboundFile> | undefined
  if (!file || typeof file.content !== 'string' || typeof file.name !== 'string') return null
  const mime = typeof file.mime === 'string' && /^(image\/(jpeg|png|gif|webp)|video\/mp4|audio\/(ogg|mpeg|mp4|wav))$/i.test(file.mime) ? file.mime : 'application/octet-stream'
  return { content: file.content, mime, name: file.name.replace(/[\r\n]/g, '').slice(0, 180) || 'WhatsApp.bin' }
}

export function inboundFileLink(data: Record<string, unknown>) {
  const file = readInboundFile(data)
  if (!file) return null
  const key = String(data.messageId || '')
  const expires = Math.floor(Date.now() / 1000) + 3600
  const url = new URL('/api/messenger-file', process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru')
  url.search = new URLSearchParams({ key, expires: String(expires), sig: signature(key, expires) }).toString()
  return { url: url.href, name: file.name }
}

export function verifyInboundFile(key: string, expires: number, sig: string) {
  return key.startsWith('whatsapp-in-') && key.length <= 180 && Number.isSafeInteger(expires) &&
    expires >= Date.now() / 1000 && /^[a-f0-9]{64}$/.test(sig) &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(signature(key, expires)))
}
