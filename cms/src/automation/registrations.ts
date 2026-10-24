import { randomBytes } from 'node:crypto'
import { createLocalReq, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { Event, EventRegistration, ReferralParticipant } from '../payload-types'
import { normalizeEmail } from './model'
import { enqueue, settings } from './store'
import { readToken } from './crypto'
import { crm, dealPerson, type CrmRecord } from './bitrix'
import { matchEvent } from './event-match'

export type Registration = ReferralParticipant | EventRegistration
export type Flow = 'referral' | 'event'
export const collectionFor = (flow: Flow) => flow === 'referral' ? 'referral-participants' as const : 'event-registrations' as const
async function createEventRegistration(payload: Payload, event: Event, data: RequiredDataFromCollectionSlug<'event-registrations'>, silent: boolean) {
  if (!event.capacity || silent) return payload.create({ collection: 'event-registrations', data, overrideAccess: true })
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Не удалось зарезервировать место')
  const req = await createLocalReq({ req: { transactionID } }, payload)
  try {
    const adapter = payload.db as unknown as { sessions: Record<string, { db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> } }> }
    await adapter.sessions[transactionID].db.execute(sql`SELECT id FROM events WHERE id=${event.id} FOR UPDATE`)
    const existing = (await payload.find({ collection: 'event-registrations', where: { key: { equals: data.key } }, limit: 1, req, overrideAccess: true })).docs[0]
    if (existing) { await payload.db.commitTransaction(transactionID); return existing }
    const count = await payload.count({ collection: 'event-registrations', where: { and: [{ eventSlug: { equals: event.slug } }, { status: { in: ['pending', 'confirmed', 'attended'] } }] }, req, overrideAccess: true })
    if (count.totalDocs >= event.capacity) throw new Error('Все места заняты')
    const record = await payload.create({ collection: 'event-registrations', data, req, overrideAccess: true })
    await payload.db.commitTransaction(transactionID)
    return record
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
}
export async function eventBySlug(payload: Payload, slug: string): Promise<Event> {
  const event = (await payload.find({ collection: 'events', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })).docs[0]
  if (!event) throw new Error('Мероприятие не найдено')
  return event
}
export async function register(payload: Payload, flow: Flow, person: { name: string; email: string; phone?: string; crmContactId?: string; dealId?: string }, eventSlug = 'factory-open-day', silent = false) {
  const saved = await settings(payload), email = normalizeEmail(person.email)
  if (!email && !silent) throw new Error('Не указан email')
  const collection = collectionFor(flow)
  const event = flow === 'event' ? await eventBySlug(payload, eventSlug) : null
  if (!silent && (flow === 'referral' ? !saved.config.referral.enabled : !event?.registrationEnabled || event.status !== 'published' || new Date(event.startsAt).getTime() <= Date.now())) throw new Error('Регистрация закрыта')
  const key = flow === 'referral' ? `referral:${person.crmContactId || email}` : `${eventSlug}:${email || person.crmContactId || person.dealId}`
  const contactGuard = person.crmContactId && flow === 'referral' ? [{ or: [{ crmContactId: { exists: false } }, { crmContactId: { equals: person.crmContactId } }] }] : []
  const found = await payload.find({ collection, where: { or: [{ key: { equals: key } }, ...(email ? [{ and: [{ email: { equals: email } }, ...contactGuard, ...(flow === 'event' ? [{ eventSlug: { equals: eventSlug } }] : [])] }] : [])] }, limit: 1, overrideAccess: true })
  let record: Registration | undefined = found.docs[0]
  if (!record) {
    const code = person.crmContactId || randomBytes(8).toString('hex')
    const identity = { key, name: person.name || email || key, email: email || undefined, phone: person.phone, crmContactId: person.crmContactId, crmDealIds: person.dealId ? [person.dealId] : [], status: 'pending' as const }
    try { record = flow === 'referral'
      ? await payload.create({ collection: 'referral-participants', data: { ...identity, code, referralUrl: saved.config.referral.linkTemplate.replace('{code}', code) }, overrideAccess: true })
      : await createEventRegistration(payload, event!, { ...identity, eventSlug }, silent) }
    catch (error) {
      record = (await payload.find({ collection, where: { key: { equals: key } }, limit: 1, overrideAccess: true })).docs[0]
      if (!record) throw error
    }
  }
  if (person.dealId || person.crmContactId) {
    const ids = Array.isArray(record.crmDealIds) ? record.crmDealIds.map(String) : []
    record = await payload.update({ collection, id: record.id, data: { ...(person.crmContactId ? { crmContactId: person.crmContactId } : {}), crmDealIds: [...new Set([...ids, ...(person.dealId ? [person.dealId] : [])])] }, overrideAccess: true })
  }
  if (!silent && record.status === 'pending') {
    if (event && event.requireConfirmation === false) await confirmRegistration(payload, flow, record)
    else await enqueue(payload, 'email', { flow, recordId: record.id, template: 'confirmation' }, `confirmation:${flow}:${record.id}:${record.tokenVersion}`)
  }
  return record
}
export async function confirmRegistration(payload: Payload, flow: Flow, record: Registration) {
  if (['blocked', 'cancelled'].includes(record.status)) throw new Error('Регистрация отменена')
  // Historical confirmation is imported as a fact, not as permission to resend
  // a welcome email or move a deal back from its current CRM stage.
  if (record.importedAt && !record.confirmedAt && record.status !== 'pending') return record
  if (record.status === 'pending') record = await payload.update({ collection: collectionFor(flow), id: record.id, data: { status: flow === 'referral' ? 'active' : 'confirmed', confirmedAt: new Date().toISOString() }, overrideAccess: true })
  await enqueue(payload, 'email', { flow, recordId: record.id, template: flow === 'referral' ? 'welcome' : 'programme' }, `confirmed:${flow}:${record.id}:${record.tokenVersion}`)
  await enqueue(payload, 'crm-sync', { flow, recordId: record.id }, `confirmed-crm:${flow}:${record.id}:${record.tokenVersion}:${JSON.stringify(record.crmDealIds)}`)
  return record
}
export async function confirmToken(payload: Payload, token: string) {
  const saved = await settings(payload), data = readToken(token, saved.secret('tokenSecret'))
  let flow: Flow, record: Registration
  if (data.recordId && ['referral', 'event'].includes(String(data.flow))) {
    flow = data.flow as Flow
    record = await payload.findByID({ collection: collectionFor(flow), id: Number(data.recordId), overrideAccess: true })
    if (Number(data.version) !== record.tokenVersion || normalizeEmail(data.email) !== record.email) throw new Error('Ссылка больше не действует')
  } else {
    const api = await crm(payload), deal = await api.call<CrmRecord>('crm.deal.get', { id: data.entityId })
    const person = await dealPerson(api, deal)
    if (normalizeEmail(data.email) !== person.email) throw new Error('Email регистрации изменился')
    const event = matchEvent((await payload.find({ collection: 'events', limit: 100, overrideAccess: true })).docs, deal, true)
    flow = event ? 'event' : 'referral'
    if (!event && !String(deal.TITLE).toLowerCase().includes(saved.config.referral.titleMatch.toLowerCase())) throw new Error('Регистрация не найдена')
    record = await register(payload, flow, { ...person, crmContactId: person.id, dealId: String(deal.ID) }, event?.slug, true)
  }
  return confirmRegistration(payload, flow, record)
}
