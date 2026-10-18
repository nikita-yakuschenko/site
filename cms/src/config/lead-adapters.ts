import type { LeadInput } from '../../../src/lib/leads'
import { leadTitle } from './lead-title'

export type LeadDeliverySettings = { mode?: 'disabled' | 'test' | 'webhook' | 'roistat' | null; url?: string | null; authorizationEnv?: string | null }

// Адрес универсального вебхука Roistat содержит ключ, поэтому хранится только в окружении CMS.
export const roistatWebhookEnv = 'ROISTAT_UNIVERSAL_WEBHOOK_URL'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

// Плоские поля под сопоставление в приёмнике (Roistat, CRM). Исходная заявка остаётся в lead.
export function webhookBody(lead: LeadInput, id: string, title: string) {
  const meta = lead.meta || {}
  const project = text(meta.projectName) || text(meta.project)
  const comment = [text(lead.message), lead.sourceUrl ? `Страница: ${lead.sourceUrl}` : ''].filter(Boolean).join('\n')
  return {
    id,
    title,
    name: lead.name,
    phone: lead.phone,
    email: text(meta.email),
    comment,
    roistat: text(meta.roistatVisit),
    page: lead.sourceUrl || '',
    form: lead.formId || '',
    project,
    lead,
  }
}

export async function deliverLead(settings: LeadDeliverySettings, lead: LeadInput, id: string, request: typeof fetch = fetch, title = leadTitle(lead)) {
  if (settings.mode === 'test') return { status: 'test' as const }
  const roistat = settings.mode === 'roistat'
  const address = roistat ? process.env[roistatWebhookEnv] : settings.mode === 'webhook' ? settings.url : null
  if (roistat && !address) throw new Error('integration-secret-missing')
  if (!address) throw new Error('integration-disabled')
  const url = new URL(address)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('integration-url-invalid')
  const authorization = !roistat && settings.authorizationEnv ? process.env[settings.authorizationEnv] : undefined
  if (!roistat && settings.authorizationEnv && !authorization) throw new Error('integration-secret-missing')
  const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': id, ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(webhookBody(lead, id, title)), redirect: 'error', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('integration-delivery-failed')
  return { status: 'sent' as const }
}
