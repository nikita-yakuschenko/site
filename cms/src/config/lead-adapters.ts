import type { LeadInput } from '../../../src/lib/leads'
import { leadTitle } from './lead-title'
import { attributionKeys, type Attribution } from '../../../src/lib/lead-attribution'

export type RoistatCounter = { projectId?: string | null; connectedAt?: string | null; enabled?: boolean | null }

export type LeadDeliverySettings = {
  mode?: 'disabled' | 'test' | 'webhook' | 'roistat' | null
  url?: string | null
  authorizationEnv?: string | null
  roistatWebhookUrl?: string | null
  // Payload stores counters as JSON; runtime still normalizes them to RoistatCounter[].
  roistatCounters?: RoistatCounter[] | { [k: string]: unknown } | unknown[] | string | number | boolean | null
  deliveryEnabled?: boolean | null
}

// Запасной адрес, если в настройках поле ещё пустое. Новый адрес сохраняется в глобале lead-delivery.
export const roistatWebhookEnv = 'ROISTAT_UNIVERSAL_WEBHOOK_URL'

// Номер проекта публичный, тот же, что на старом сайте. Сайт использует его, пока в настройках нет своего списка.
export const fallbackRoistatProjectId = 'a8d2dafd7f03641ecee21e18684113d2'
export const fallbackRoistatConnectedAt = '2026-10-18'

export function deliveryIsEnabled(settings: LeadDeliverySettings) {
  return settings.mode !== 'disabled' && settings.deliveryEnabled !== false
}

export function roistatWebhookAddress(settings: LeadDeliverySettings) {
  return text(settings.roistatWebhookUrl) || text(process.env[roistatWebhookEnv])
}

export function roistatWebhookUrlError(value: unknown) {
  const raw = text(value)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && !url.username && !url.password ? '' : 'Укажите адрес HTTPS без логина и пароля'
  } catch {
    return 'Укажите адрес HTTPS'
  }
}

export function normalizeRoistatCounters(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as RoistatCounter
    const projectId = text(row.projectId)
    if (!/^[a-zA-Z0-9]{8,64}$/.test(projectId)) return []
    const connectedAt = text(row.connectedAt)
    return [{ projectId, connectedAt: /^\d{4}-\d{2}-\d{2}$/.test(connectedAt) ? connectedAt : '', enabled: row.enabled !== false }]
  })
}

// Пустой список значит «настройка ещё не сохранялась»: сайт оставляет прежний счётчик.
export function activeRoistatProjectId(value: unknown) {
  const rows = normalizeRoistatCounters(value)
  if (!rows.length) return { projectId: fallbackRoistatProjectId, configured: false }
  const active = rows.find(row => row.enabled)
  return { projectId: active?.projectId || null, configured: true }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

// Плоские поля под сопоставление в приёмнике (Roistat, CRM). Исходная заявка остаётся в lead.
export function webhookBody(lead: LeadInput, id: string, title: string) {
  const meta = lead.meta || {}
  const project = text(meta.projectName) || text(meta.project)
  const attribution: Attribution = Object.fromEntries(attributionKeys.flatMap(key => text(meta[key]) ? [[key, text(meta[key])]] : []))
  const excluded: readonly string[] = [...attributionKeys, 'roistatVisit', 'formHeading', 'email']
  const context = Object.entries(meta).filter(([key, value]) => !excluded.includes(key) && value !== null && value !== undefined && value !== '').map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
  const comment = [text(lead.message), lead.sourceUrl ? `Страница: ${lead.sourceUrl}` : '', `formname: ${text(meta.formHeading) || title.replace(/^Новая заявка с сайта: /, '')}`, `Согласие на обработку персональных данных: ${lead.consent ? 'да' : 'нет'}`, ...context, ...Object.entries(attribution).map(([key, value]) => `${key}: ${value}`), text(meta.roistatVisit) ? `roistat: ${text(meta.roistatVisit)}` : ''].filter(Boolean).join('\n')
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
    ...attribution,
    lead,
  }
}

export async function deliverLead(settings: LeadDeliverySettings, lead: LeadInput, id: string, request: typeof fetch = fetch, title = leadTitle(lead)) {
  if (!deliveryIsEnabled(settings)) throw new Error('integration-disabled')
  if (settings.mode === 'test') return { status: 'test' as const }
  const roistat = settings.mode === 'roistat'
  const address = roistat ? roistatWebhookAddress(settings) : settings.mode === 'webhook' ? settings.url : null
  if (roistat && !address) throw new Error('integration-secret-missing')
  if (roistat && roistatWebhookUrlError(address)) throw new Error('integration-url-invalid')
  if (!address) throw new Error('integration-disabled')
  const url = new URL(address)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('integration-url-invalid')
  const authorization = !roistat && settings.authorizationEnv ? process.env[settings.authorizationEnv] : undefined
  if (!roistat && settings.authorizationEnv && !authorization) throw new Error('integration-secret-missing')
  const response = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-ID': id, ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(webhookBody(lead, id, title)), redirect: 'error', signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error('integration-delivery-failed')
  return { status: 'sent' as const }
}
