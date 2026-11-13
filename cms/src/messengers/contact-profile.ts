import type { Payload } from 'payload'
import { currentMessengerToken } from './authorize-lead'
import { bitrixCall, portalDomain } from './bitrix-connector'
import { messengerTitles, nationalPhone, type MessengerChannel } from './phone'

export async function saveMessengerContactProfile(payload: Payload, data: { channel: MessengerChannel, phone: string, name: string, username: string }) {
  const phone = nationalPhone(data.phone)
  const name = data.name.replace(/[\s\p{Cc}]+/gu, ' ').trim().slice(0, 80)
  const username = data.username.trim().replace(/^@/, '')
  const handle = /^[A-Za-z0-9_]{3,32}$/.test(username) ? `@${username}` : ''
  if (!phone || (!name && !handle)) return { skipped: true }

  const token = await currentMessengerToken(payload)
  const call = <T>(method: string, params: Record<string, unknown>) => bitrixCall<T>(portalDomain, token, method, params)
  const matches = await call<{ CONTACT?: (number | string)[] }>('crm.duplicate.findbycomm', {
    entity_type: 'CONTACT', type: 'PHONE', values: [`+${phone}`],
  })
  const ids = matches?.CONTACT ?? []
  if (ids.length > 1) return { skipped: true, reason: 'ambiguous-contact' }
  if (ids.length !== 1) throw new Error('Контакт CRM по телефону ещё не найден')
  const id = ids[0]
  const contact = await call<{ NAME?: string, COMMENTS?: string }>('crm.contact.get', { id })
  const comments = contact.COMMENTS || ''
  const profile = [name, handle].filter(Boolean).join(' · ').replace(/[<>&\[\]]/g, '')
  const entry = `${messengerTitles[data.channel]}: ${profile}`
  const fields: Record<string, string> = {}
  if (name && (!contact.NAME?.trim() || nationalPhone(contact.NAME) === phone)) fields.NAME = name
  if (profile && !comments.split(/\r?\n/).includes(entry)) fields.COMMENTS = comments ? `${comments}\n${entry}` : entry
  if (Object.keys(fields).length) await call('crm.contact.update', { id, fields })
  return { updated: Object.keys(fields).length > 0 }
}
