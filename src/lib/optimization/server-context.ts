import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { parseConsent } from '../../consent/storage'
import { CONSENT_COOKIE, CONSENT_VERSION } from '../../consent/types'
import { optimizationFlags } from './flags'
import type { OptimizationRegion } from './contracts'

export const OPTIMIZATION_CONTEXT_COOKIE = 'avgst_optimization_context'
export const OPTIMIZATION_CONTEXT_HEADER = 'x-avgst-optimization-context'
export const OPTIMIZATION_PREFETCH_HEADER = 'x-avgst-optimization-prefetch'
export const CONTEXT_LIFETIME_MS = 24 * 3600_000
export type OptimizationContext = { subjectKey: string; sessionKey: string; region: OptimizationRegion; analyticsAllowed: boolean; prefetch: boolean }
const mac = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('hex')
export function optimizationContextSecret() { const secret = process.env.OPTIMIZATION_CONTEXT_SECRET; return secret && secret.length >= 32 ? secret : null }
export function verifyOptimizationCookie(token: string | undefined, secret: string, now = Date.now()) {
  if (secret.length < 32 || !token || token.length > 240) return null
  const [version, browser, session, issued, signature, ...extra] = token.split('.')
  if (extra.length || version !== 'v1' || !/^[a-f0-9]{32}$/.test(browser ?? '') || !/^[a-f0-9]{32}$/.test(session ?? '') || !/^\d{13}$/.test(issued ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '')) return null
  const time = Number(issued)
  if (time > now + 300_000 || time < now - CONTEXT_LIFETIME_MS) return null
  const expected = mac(`optimization-cookie:${version}.${browser}.${session}.${issued}`, secret)
  if (!timingSafeEqual(Buffer.from(signature!, 'hex'), Buffer.from(expected, 'hex'))) return null
  return { subjectKey: mac(`optimization-subject:v1:${browser}`, secret), sessionKey: mac(`optimization-session:v1:${session}`, secret) }
}
export function createOptimizationCookie(secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error('Missing optimization context secret')
  const data = `v1.${randomBytes(16).toString('hex')}.${randomBytes(16).toString('hex')}.${now}`
  return `${data}.${mac(`optimization-cookie:${data}`, secret)}`
}
export function requestCookie(request: { headers: Headers }, name: string) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
}
export function hasOptimizationAnalytics(raw: string | undefined) {
  const consent = parseConsent(raw)
  return Boolean(consent && consent.version === CONSENT_VERSION && consent.decidedAt && consent.analytics)
}
export function isOptimizationPrefetch(headers: Headers) {
  return headers.has('next-router-prefetch') || headers.has('next-router-segment-prefetch') || /prefetch/i.test(headers.get('purpose') ?? headers.get('sec-purpose') ?? '')
}
/** Called by Proxy before any CMS access. Browser-supplied internal headers are always removed. */
export function prepareOptimizationProxy(request: { headers: Headers }, headers: Headers, now = Date.now()) {
  headers.delete(OPTIMIZATION_CONTEXT_HEADER)
  headers.delete(OPTIMIZATION_PREFETCH_HEADER)
  const flags = optimizationFlags(), secret = optimizationContextSecret()
  if (!flags.enabled || (!flags.ranking && !flags.events) || !secret) return null
  const prefetch = isOptimizationPrefetch(request.headers)
  headers.set(OPTIMIZATION_PREFETCH_HEADER, prefetch ? '1' : '0')
  const existing = requestCookie(request, OPTIMIZATION_CONTEXT_COOKIE)
  // A speculative request must not mint identity or create assignments.
  const token = verifyOptimizationCookie(existing, secret, now) ? existing! : prefetch ? null : createOptimizationCookie(secret, now)
  if (token) headers.set(OPTIMIZATION_CONTEXT_HEADER, token)
  return token
}
export function contextFromRequest(request: { headers: Headers }, token: string, region: OptimizationRegion, prefetch = false): OptimizationContext | null {
  const secret = optimizationContextSecret(), identity = secret && verifyOptimizationCookie(token, secret)
  return identity ? { ...identity, region, prefetch, analyticsAllowed: hasOptimizationAnalytics(requestCookie(request, CONSENT_COOKIE)) } : null
}
/** Only for Server Components behind Proxy. The signature is rechecked, never trusted by header name. */
export function readOptimizationSSRContext(headers: Headers) {
  const token = headers.get(OPTIMIZATION_CONTEXT_HEADER)
  if (!token) return null
  const context = contextFromRequest({ headers }, token, headers.get('x-avgst-region') === 'msk' ? 'msk' : 'nn', headers.get(OPTIMIZATION_PREFETCH_HEADER) === '1')
  return context ? { context, token } : null
}
