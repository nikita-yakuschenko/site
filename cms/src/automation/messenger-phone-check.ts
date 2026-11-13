import type { Payload } from 'payload'
import { crm, type CrmRecord } from './bitrix'
import { messengerChannels, messengerTitles, nationalPhone, type MessengerChannel } from '../messengers/phone'
import { lookupMessengerContact, type MessengerLookupResult } from '../messengers/gateway'

const labels: Record<MessengerChannel, string> = {
  whatsapp: messengerTitles.whatsapp,
  telegram: messengerTitles.telegram,
  max: messengerTitles.max,
}

export function phoneCheckCommentText(phone: string, results: Record<MessengerChannel, MessengerLookupResult>, preferred = '') {
  const readable = `+${nationalPhone(phone) || phone.replace(/\D/g, '')}`
  const preferredLabel = preferred && preferred in labels ? labels[preferred as MessengerChannel] : ''
  const lines = messengerChannels.map(channel => {
    const result = results[channel]
    const mark = result === 'found'
      ? 'контакт найден'
      : result === 'missing'
        ? 'контакт не найден'
        : 'проверка не удалась (номер мессенджера не подключён или ответ недоступен)'
    return `${labels[channel]}: ${mark}.`
  })
  const anyMissing = messengerChannels.some(channel => results[channel] === 'missing')
  return [
    `Проверка номера ${readable} в мессенджерах.`,
    preferredLabel ? `Клиент выбрал: ${preferredLabel}.` : '',
    ...lines,
    anyMissing
      ? 'Если контакт не найден, у собеседника могут быть включены настройки конфиденциальности: номер есть в мессенджере, но поиск по телефону его не показывает.'
      : '',
  ].filter(Boolean).join('\n')
}

export async function attachMessengerPhoneCheck(payload: Payload, data: {
  requestId: string
  phone: string
  title: string
  channel?: string
  createdAfter?: string
  attempts?: number
}) {
  const api = await crm(payload)
  const phone = nationalPhone(data.phone) || data.phone.replace(/\D/g, '')
  if (!phone) throw new Error('Нет телефона для проверки')
  const since = data.createdAfter || new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const dealId = await findDealId(api, data.title, phone, since)
  // Ждём появления сделки из заявки; сами лид/сделку здесь не создаём.
  if (!dealId) throw new Error('Сделка ещё не появилась в CRM')

  const results = {} as Record<MessengerChannel, MessengerLookupResult>
  for (const channel of messengerChannels) {
    results[channel] = await lookupMessengerContact(channel, phone)
  }

  const commentId = await api.call<number>('crm.timeline.comment.add', {
    fields: {
      ENTITY_ID: Number(dealId),
      ENTITY_TYPE: 'deal',
      COMMENT: phoneCheckCommentText(phone, results, data.channel || ''),
    },
  })
  return { dealId: String(dealId), commentId: Number(commentId), results }
}

async function findDealId(api: Awaited<ReturnType<typeof crm>>, title: string, phone: string, sinceIso: string) {
  if (title) {
    const byTitle = await api.call<CrmRecord[]>('crm.deal.list', {
      filter: { TITLE: title },
      select: ['ID', 'TITLE', 'DATE_CREATE', 'CONTACT_ID'],
      order: { ID: 'DESC' },
      start: 0,
    }).catch(() => [])
    for (const deal of byTitle || []) {
      if (String(deal.DATE_CREATE || '') && String(deal.DATE_CREATE) < sinceIso) continue
      if (await dealPhoneMatches(api, deal, phone)) return Number(deal.ID)
    }
  }
  const recent = await api.call<CrmRecord[]>('crm.deal.list', {
    filter: { '>=DATE_CREATE': sinceIso.slice(0, 10) },
    select: ['ID', 'TITLE', 'DATE_CREATE', 'CONTACT_ID'],
    order: { ID: 'DESC' },
    start: 0,
  }).catch(() => [])
  for (const deal of recent || []) {
    if (String(deal.DATE_CREATE || '') && String(deal.DATE_CREATE) < sinceIso) continue
    if (title && String(deal.TITLE || '') !== title) continue
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
