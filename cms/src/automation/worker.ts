import type { Payload } from 'payload'
import nodemailer from 'nodemailer'
import { claimJob, enqueue, failJob, finishJob, settings } from './store'
import { crm, dealPerson, type CrmRecord } from './bitrix'
import { dmpMatches, renderTemplate, type MailTemplate } from './model'
import { collectionFor, confirmRegistration, eventBySlug, register, type Flow } from './registrations'
import { calendar, eventValues } from './calendar'
import { signToken } from './crypto'
import { matchEvent } from './event-match'
import type { EventRegistration, ReferralParticipant } from '../payload-types'

class Paused extends Error {}
async function sendMail(payload: Payload, data: Record<string, unknown>) {
  const saved = await settings(payload), flow = data.flow as Flow
  if (!saved.config.mail.enabled) throw new Paused('Отправка писем приостановлена')
  if (flow === 'referral' && !saved.config.referral.enabled) throw new Paused('Реферальная программа приостановлена')
  const record = await payload.findByID({ collection: collectionFor(flow), id: Number(data.recordId), overrideAccess: true })
  if (!record.email || ['blocked', 'cancelled'].includes(record.status) || (data.template === 'confirmation' && record.status !== 'pending') || (data.template !== 'confirmation' && record.status === 'pending')) return { skipped: true }
  const event = flow === 'event' ? await eventBySlug(payload, (record as EventRegistration).eventSlug) : null
  if (event?.status === 'cancelled') return { skipped: true }
  const origin = (process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru').replace(/\/$/, '')
  const ttl = event?.tokenTtlHours || saved.config.referral.tokenTtlHours
  const secret = saved.secret('tokenSecret')
  if (!secret) throw new Error('Не настроен ключ подтверждения регистрации')
  const token = signToken({ flow, recordId: record.id, email: record.email, version: record.tokenVersion, exp: Date.now() + ttl * 3600000 }, secret)
  const values = { name: record.name, ttl_hours: ttl, code: (record as ReferralParticipant).code, referral_url: (record as ReferralParticipant).referralUrl, rules_url: saved.config.referral.rulesUrl, confirm_url: `${origin}/api/automation/confirm?token=${encodeURIComponent(token)}`, ...(event ? eventValues(event, origin) : {}) }
  let template: MailTemplate
  if (event) template = data.template === 'confirmation' ? event.confirmationEmail || {} : data.template === 'reminder' ? event.reminderEmail || {} : event.programmeEmail || {}
  else template = data.template === 'confirmation' ? saved.config.referral.confirmationEmail : saved.config.referral.welcomeEmail
  if (!template.subject || (!template.html && !template.text)) throw new Error('Заполните тему и содержание письма в CMS')
  const transport = nodemailer.createTransport({ host: saved.config.mail.host, port: saved.config.mail.port, secure: saved.config.mail.secure, auth: saved.config.mail.user ? { user: saved.config.mail.user, pass: saved.secret('smtpPassword') } : undefined, connectionTimeout: 15000, socketTimeout: 30000, disableFileAccess: true, disableUrlAccess: true })
  try {
    await transport.sendMail({ from: saved.config.mail.from, to: record.email, replyTo: saved.config.mail.replyTo || undefined, subject: renderTemplate(template.subject, values, false), html: template.html ? renderTemplate(template.html, values) : undefined, text: template.text ? renderTemplate(template.text, values, false) : undefined, messageId: `<${String(data.deliveryKey || `${flow}-${record.id}-${data.template}-${record.tokenVersion}`).replace(/[^a-zA-Z0-9_.-]/g, '-')}@avgst.ru>`, ...(event && data.template !== 'confirmation' ? { icalEvent: { method: 'PUBLISH' as const, content: calendar(event) } } : {}) })
    return { sent: true }
  } finally { transport.close() }
}
async function syncCrm(payload: Payload, data: Record<string, unknown>) {
  const saved = await settings(payload), api = await crm(payload), flow = data.flow as Flow
  const record = await payload.findByID({ collection: collectionFor(flow), id: Number(data.recordId), overrideAccess: true })
  if (!['active', 'confirmed', 'attended'].includes(record.status)) return { skipped: true }
  const event = flow === 'event' ? await eventBySlug(payload, (record as EventRegistration).eventSlug) : null
  if (record.crmContactId) {
    const fields: CrmRecord = {}
    if (saved.config.referral.emailConfirmedField) fields[saved.config.referral.emailConfirmedField] = 1
    if (flow === 'referral') {
      fields[saved.config.referral.participantField] = 1
      fields[saved.config.referral.linkField] = (record as ReferralParticipant).referralUrl
    }
    if (Object.keys(fields).length) await api.call('crm.contact.update', { id: record.crmContactId, fields })
  }
  const stage = event?.crmConfirmedStage || (flow === 'referral' ? saved.config.referral.confirmedStage : '')
  if (stage && Array.isArray(record.crmDealIds)) for (const id of record.crmDealIds) {
    const deal = await api.call<CrmRecord>('crm.deal.get', { id })
    if (deal.STAGE_ID === stage || ['S', 'F'].includes(String(deal.STAGE_SEMANTIC_ID))) continue
    await api.call('crm.deal.update', { id, fields: { STAGE_ID: stage } })
  }
  return { synced: Boolean(record.crmContactId) }
}
export async function processJob(payload: Payload, kind: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (kind === 'email') return sendMail(payload, data)
  if (kind === 'crm-sync') return syncCrm(payload, data)
  if (kind === 'intake') {
    const saved = await settings(payload)
    if (!(saved.cutover as { active?: boolean } | null)?.active) throw new Paused('Перенос ещё не активирован')
    const flow = data.formId === 'referral-program' ? 'referral' : 'event'
    const meta = (data.meta || {}) as Record<string, unknown>
    const record = await register(payload, flow, { name: String(data.name || ''), email: String(meta.email || ''), phone: String(data.phone || '') }, String(meta.eventSlug || 'factory-open-day'))
    return { recordId: record.id }
  }
  if (kind === 'dmp') {
    const saved = await settings(payload), config = saved.config.dmp
    if (!config.enabled) throw new Paused('DMP приостановлен')
    const api = await crm(payload, true), deal = await api.call<CrmRecord>('crm.deal.get', { id: data.dealId })
    const sources = await api.call<CrmRecord[]>('crm.status.list', { filter: { ENTITY_ID: 'SOURCE' } })
    const source = sources.filter(s => String(s.NAME).toLowerCase() === config.sourceName.toLowerCase())
    if (source.length !== 1) throw new Error('Источник DMP должен быть найден в CRM однозначно')
    if (!dmpMatches(deal, config, String(source[0].STATUS_ID))) return { matched: false }
    let targetStage = config.targetStage
    if (!targetStage) {
      const stages = await api.call<CrmRecord[]>('crm.status.list', { filter: { ENTITY_ID: `DEAL_STAGE_${config.targetCategory}` } })
      const found = stages.filter(s => String(s.NAME).toLowerCase() === 'новая')
      if (found.length !== 1) throw new Error('Укажите целевой этап DMP в CMS')
      targetStage = String(found[0].STATUS_ID)
    }
    if (!config.dryRun) await api.call('crm.item.update', { entityTypeId: 2, id: data.dealId, fields: { categoryId: config.targetCategory, stageId: targetStage, assignedById: config.targetResponsible } })
    return { matched: true, dryRun: config.dryRun, targetCategory: config.targetCategory, targetStage, targetResponsible: config.targetResponsible }
  }
  if (kind === 'crm-registration') {
    const api = await crm(payload), saved = await settings(payload), deal = await api.call<CrmRecord>('crm.deal.get', { id: data.dealId }), person = await dealPerson(api, deal)
    const title = String(deal.TITLE || '').toLowerCase()
    const events = await payload.find({ collection: 'events', limit: 100, overrideAccess: true })
    const event = matchEvent(events.docs, deal)
    const isReferral = title.includes(saved.config.referral.titleMatch.toLowerCase()) || title.includes('регистрация в реферальной программе')
    if (!event && !isReferral) return { matched: false }
    const flow = event ? 'event' : 'referral', record = await register(payload, flow, { ...person, crmContactId: person.id, dealId: String(deal.ID) }, event?.slug)
    if (data.force && record.status === 'pending') {
      const renewed = await payload.update({ collection: collectionFor(flow), id: record.id, data: { tokenVersion: (record.tokenVersion || 1) + 1 }, overrideAccess: true })
      await enqueue(payload, 'email', { flow, recordId: record.id, template: 'confirmation' }, `confirmation:${flow}:${record.id}:${renewed.tokenVersion}`)
    } else if (record.status !== 'pending') await confirmRegistration(payload, flow, record)
    return { recordId: record.id }
  }
  throw new Error('Неизвестный тип задания')
}
export async function scheduleReminders(payload: Payload) {
  const events = await payload.find({ collection: 'events', where: { and: [{ reminderEnabled: { equals: true } }, { status: { equals: 'published' } }, { startsAt: { greater_than: new Date().toISOString() } }] }, limit: 100, overrideAccess: true })
  for (const event of events.docs) {
    const when = new Date(event.startsAt).getTime() - (event.reminderHoursBefore ?? 24) * 3600000
    if (when > Date.now()) continue
    let page = 1
    for (;;) {
      const rows = await payload.find({ collection: 'event-registrations', where: { and: [{ eventSlug: { equals: event.slug } }, { status: { equals: 'confirmed' } }] }, limit: 100, page, overrideAccess: true })
      for (const row of rows.docs) await enqueue(payload, 'email', { flow: 'event', recordId: row.id, template: 'reminder' }, `reminder:${event.id}:${event.startsAt}:${row.id}`)
      if (!rows.hasNextPage) break
      page++
    }
  }
}
const state = globalThis as typeof globalThis & { automationTimer?: ReturnType<typeof setInterval> }
export function startAutomationWorker(payload: Payload) {
  if (state.automationTimer) return
  let busy = false, lastReminders = 0
  state.automationTimer = setInterval(async () => {
    if (busy) return
    busy = true
    try {
      const saved = await settings(payload)
      if (!(saved.cutover as { active?: boolean } | null)?.active) return
      if (Date.now() - lastReminders > 60000) { await scheduleReminders(payload); lastReminders = Date.now() }
      for (let count = 0; count < 10; count++) {
        const claimed = await claimJob(payload)
        if (!claimed) break
        const { job, lease } = claimed
        try { const result = await processJob(payload, job.kind, { ...(job.data as Record<string, unknown>), deliveryKey: job.key }); await finishJob(payload, job.id, lease, result) }
        catch (error) { await failJob(payload, job.id, lease, job.attempts || 1, error, error instanceof Paused) }
      }
    } catch (error) { payload.logger.error({ failure: error instanceof Error ? error.name : 'Error' }, 'Ошибка очереди автоматизации') }
    finally { busy = false }
  }, 3000)
  state.automationTimer.unref()
}
