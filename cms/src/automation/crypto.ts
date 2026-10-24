import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const key = () => {
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.length < 16) throw new Error('Не настроено шифрование секретов CMS')
  return createHash('sha256').update('avgst-automation-v1:' + process.env.PAYLOAD_SECRET).digest()
}
export function seal(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return 'v1.' + [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
}
export function unseal(value: unknown): string {
  if (!value || typeof value !== 'string') return ''
  const [version, iv, tag, body] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !body) throw new Error('Invalid encrypted secret')
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  cipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([cipher.update(Buffer.from(body, 'base64url')), cipher.final()]).toString('utf8')
}
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
}
export function signToken(data: Record<string, unknown>, secret: string) {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url')
  return body + '.' + createHmac('sha256', secret).update(body).digest('base64url')
}
export function readToken(token: string, secret: string) {
  const [body, signature] = token.split('.')
  if (!body || !signature || !secret || !equalSecret(signature, createHmac('sha256', secret).update(body).digest('base64url'))) throw new Error('Некорректная ссылка')
  const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>
  const expiry = Number(data.exp)
  if (!expiry || (expiry < 1e12 ? expiry * 1000 : expiry) < Date.now()) throw new Error('Ссылка устарела')
  return data
}
