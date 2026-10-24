import type { Payload } from 'payload'
import { settings } from './store'

export type CrmRecord = Record<string, unknown>
export class BitrixClient {
  constructor(private readonly base: string, readonly domain: string, private readonly request: typeof fetch = fetch) {
    const url = new URL(base)
    if (url.protocol !== 'https:' || url.hostname !== domain || !/^\/rest\/\d+\/[^/]+\/?$/.test(url.pathname) || url.search || url.hash) throw new Error('Укажите входящий вебхук CRM для настроенного портала')
  }
  async call<T = CrmRecord>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!/^(crm|user|event)\.[a-zA-Z0-9.]+$/.test(method)) throw new Error('Недопустимый метод CRM')
    const response = await this.request(this.base.replace(/\/?$/, '/') + method + '.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: AbortSignal.timeout(20000), redirect: 'error' })
    const body = await response.json() as { result: T; error?: string }
    if (!response.ok || body.error) throw new Error('Ошибка CRM: ' + String(body.error || response.status))
    return body.result
  }
  async page(method: string, filter: Record<string, unknown>, select: string[], start = 0) {
    return this.call<CrmRecord[]>(method, { filter, select, order: { ID: 'ASC' }, start })
  }
}
export async function crm(payload: Payload, dmp = false) {
  const saved = await settings(payload)
  return new BitrixClient(saved.secret(dmp ? 'dmpWebhook' : 'bitrixWebhook'), saved.config.crm.domain)
}
export function crmEmail(contact: CrmRecord) {
  const values = contact.EMAIL
  if (Array.isArray(values)) return String((values.find(v => v.VALUE || v.value) || {}).VALUE || (values[0] || {}).value || '').trim().toLowerCase()
  return typeof values === 'string' ? values.trim().toLowerCase() : ''
}
export function crmPhone(contact: CrmRecord) {
  const values = contact.PHONE
  return Array.isArray(values) ? String(values[0]?.VALUE || '') : typeof values === 'string' ? values : ''
}
export function crmName(contact: CrmRecord) { return [contact.NAME, contact.SECOND_NAME, contact.LAST_NAME].filter(Boolean).join(' ').trim() || crmEmail(contact) || String(contact.ID) }
export function yes(value: unknown) { return value === true || value === 1 || value === '1' || value === 'Y' }
export async function dealPerson(api: BitrixClient, deal: CrmRecord) {
  let id = Number(deal.CONTACT_ID || (Array.isArray(deal.CONTACT_IDS) ? deal.CONTACT_IDS[0] : 0))
  let contact: CrmRecord = id ? await api.call('crm.contact.get', { id }) : deal
  if (!id && crmEmail(deal)) {
    const matches = await api.call<{ CONTACT?: number[] }>('crm.duplicate.findbycomm', { entity_type: 'CONTACT', type: 'EMAIL', values: [crmEmail(deal)] })
    id = matches.CONTACT?.[0] || 0
    if (id) contact = await api.call('crm.contact.get', { id })
  }
  return { contact, id: id ? String(id) : '', email: crmEmail(contact) || crmEmail(deal), name: crmName(contact), phone: crmPhone(contact) }
}
