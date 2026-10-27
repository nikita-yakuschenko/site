import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { RequestLimitError } from './request-security'
export const requestPolicies = {
  lead: { limit: 5, windowMs: 600000 },
  views: { limit: 60, windowMs: 60000 },
  reactions: { limit: 30, windowMs: 60000 },
  consent: { limit: 20, windowMs: 60000 },
  webhook: { limit: 120, windowMs: 60000 },
  staff: { limit: 120, windowMs: 60000 },
} as const
export type RequestScope = keyof typeof requestPolicies
export function requestIdentity(request: { headers: Headers }, secret: string): string {
  // Traefik appends the connecting address. Never trust a client-supplied first hop.
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || ''
  const ip = isIP(forwarded) ? forwarded : 'unknown'
  return createHmac('sha256', secret).update(ip).digest('hex')
}
export async function requirePublicRequestLimit(request: Request, scope: RequestScope, send: typeof fetch = fetch) {
  const key = process.env.CMS_SITE_API_KEY
  if (!key) throw new RequestLimitError(503, 'rate-limit-unavailable')
  try {
    const response = await send(`${process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru'}/api/request-limits/check`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, identity: requestIdentity(request, key) }), signal: AbortSignal.timeout(5000), cache: 'no-store',
    })
    if (!response.ok) throw new RequestLimitError(response.status === 429 ? 429 : 503, response.status === 429 ? 'too-many-attempts' : 'rate-limit-unavailable')
  } catch (error) { if (error instanceof RequestLimitError) throw error; throw new RequestLimitError(503, 'rate-limit-unavailable') }
}
export function requestFailure(error: unknown): Response {
  const known = error instanceof RequestLimitError
  return Response.json({ error: known ? error.code : 'invalid-input' }, { status: known ? error.status : 400, headers: { 'Cache-Control': 'no-store', ...(known && error.status === 429 ? { 'Retry-After': '60' } : {}) } })
}
