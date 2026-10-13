import type { LeadInput } from '../../../src/lib/leads'

export type LeadDeliverySettings = { mode?: 'disabled' | 'test' | 'webhook' | null; url?: string | null; authorizationEnv?: string | null }
export async function deliverLead(settings: LeadDeliverySettings, lead: LeadInput, id: string, request: typeof fetch = fetch) {
  if (settings.mode === 'test') return { status: 'test' as const }
  if (settings.mode !== 'webhook' || !settings.url) throw new Error('integration-disabled')
  const url = new URL(settings.url)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('integration-url-invalid')
  const authorization = settings.authorizationEnv ? process.env[settings.authorizationEnv] : undefined
  if (settings.authorizationEnv && !authorization) throw new Error('integration-secret-missing')
  const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': id, ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify({ id, lead }), redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('integration-delivery-failed')
  return { status: 'sent' as const }
}
