import type { Payload } from 'payload'
import { crm, type CrmRecord } from './bitrix'

const channels: Record<string, string> = { max: 'MAX', telegram: 'Telegram', whatsapp: 'WhatsApp' }

export function passportCommentText(input: { projectName: string, phone: string, channel?: string }) {
  const where = input.channel ? channels[input.channel] || input.channel : ''
  return [
    `Паспорт проекта «${input.projectName}».`,
    where ? `Куда направить: ${where}.` : '',
    `Телефон клиента: ${input.phone}.`,
    'Файл во вложении. Ознакомьтесь и отправьте клиенту сами.',
  ].filter(Boolean).join('\n')
}

export function dealMatchesPassport(deal: CrmRecord, title: string, sinceIso: string) {
  const created = String(deal.DATE_CREATE || '')
  if (created && created < sinceIso) return false
  const dealTitle = String(deal.TITLE || '')
  if (title && dealTitle === title) return true
  return /паспорт проекта/i.test(dealTitle)
}

export async function loadPassportPdf(slug: string, region: string) {
  const origin = (process.env.SITE_PUBLIC_URL || 'https://avgst.ru').replace(/\/$/, '')
  const key = process.env.CMS_SITE_API_KEY || ''
  if (!key) throw new Error('Не настроен ключ сайта для паспорта')
  const response = await fetch(`${origin}/api/passports/internal/${encodeURIComponent(slug)}?region=${encodeURIComponent(region)}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  })
  if (response.status === 503) throw new Error('Паспорт ещё собирается')
  if (!response.ok) throw new Error('Паспорт недоступен')
  const bytes = Buffer.from(await response.arrayBuffer())
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error('Файл паспорта слишком большой')
  const filename = response.headers.get('x-passport-filename') || `AVGST_${slug}_${region.toUpperCase()}.pdf`
  return { filename, base64: bytes.toString('base64') }
}

export async function attachPassportComment(payload: Payload, data: {
  requestId: string
  phone: string
  slug: string
  region: string
  projectName: string
  channel?: string
  title: string
  createdAfter?: string
  attempts?: number
}) {
  const api = await crm(payload)
  const phone = data.phone.replace(/\D/g, '')
  const readable = phone ? `+${phone}` : ''
  if (!readable || !data.slug || !data.region || !data.projectName) throw new Error('Не хватает данных паспорта')
  const since = data.createdAfter || new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  let dealId = await findDealId(api, data.title, readable, since)
  if (!dealId && (data.attempts || 0) >= 4) dealId = await createDeal(api, data.title, readable, data.projectName)
  if (!dealId) throw new Error('Сделка ещё не появилась в CRM')
  const file = await loadPassportPdf(data.slug, data.region)
  const commentId = await api.call<number>('crm.timeline.comment.add', {
    fields: {
      ENTITY_ID: Number(dealId),
      ENTITY_TYPE: 'deal',
      COMMENT: passportCommentText({ projectName: data.projectName, phone: readable, channel: data.channel }),
      FILES: [[file.filename, file.base64]],
    },
  }, 60000)
  await api.call('crm.timeline.item.pin', { id: Number(commentId), ownerTypeId: 2, ownerId: Number(dealId) })
  return { dealId: String(dealId), commentId: Number(commentId), filename: file.filename }
}

async function findDealId(api: Awaited<ReturnType<typeof crm>>, title: string, phone: string, sinceIso: string) {
  const byTitle = await api.call<CrmRecord[]>('crm.deal.list', {
    filter: { TITLE: title },
    select: ['ID', 'TITLE', 'DATE_CREATE', 'CONTACT_ID'],
    order: { ID: 'DESC' },
    start: 0,
  }).catch(() => [])
  for (const deal of byTitle || []) {
    if (!dealMatchesPassport(deal, title, sinceIso)) continue
    if (await dealPhoneMatches(api, deal, phone)) return Number(deal.ID)
  }
  const recent = await api.call<CrmRecord[]>('crm.deal.list', {
    filter: { '>=DATE_CREATE': sinceIso.slice(0, 10), '%TITLE': 'паспорт проекта' },
    select: ['ID', 'TITLE', 'DATE_CREATE', 'CONTACT_ID'],
    order: { ID: 'DESC' },
    start: 0,
  }).catch(() => [])
  for (const deal of recent || []) {
    if (!dealMatchesPassport(deal, title, sinceIso)) continue
    if (await dealPhoneMatches(api, deal, phone)) return Number(deal.ID)
  }
  return 0
}

async function dealPhoneMatches(api: Awaited<ReturnType<typeof crm>>, deal: CrmRecord, phone: string) {
  const contactId = Number(deal.CONTACT_ID || 0)
  if (!contactId) return false
  const contact = await api.call<CrmRecord>('crm.contact.get', { id: contactId }).catch(() => null)
  if (!contact) return false
  const values = Array.isArray(contact.PHONE) ? contact.PHONE : []
  return values.some(item => String((item as { VALUE?: string }).VALUE || '').replace(/\D/g, '').endsWith(phone.slice(-10)))
}

async function createDeal(api: Awaited<ReturnType<typeof crm>>, title: string, phone: string, projectName: string) {
  const duplicates = await api.call<{ CONTACT?: number[] }>('crm.duplicate.findbycomm', {
    entity_type: 'CONTACT',
    type: 'PHONE',
    values: [phone],
  }).catch(() => ({ CONTACT: [] as number[] }))
  let contactId = duplicates.CONTACT?.[0] || 0
  if (!contactId) {
    contactId = Number(await api.call<number>('crm.contact.add', {
      fields: {
        NAME: projectName.slice(0, 80) || 'Клиент',
        LAST_NAME: 'Паспорт проекта',
        OPENED: 'Y',
        TYPE_ID: 'CLIENT',
        PHONE: [{ VALUE: phone, VALUE_TYPE: 'WORK' }],
      },
    }))
  }
  return Number(await api.call<number>('crm.deal.add', {
    fields: {
      TITLE: title,
      CONTACT_ID: contactId,
      OPENED: 'Y',
      COMMENTS: `Запрос паспорта проекта «${projectName}». Телефон: ${phone}.`,
    },
  }))
}
