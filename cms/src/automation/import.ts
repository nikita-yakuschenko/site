import type { Payload } from 'payload'
import { crm, crmEmail, crmName, crmPhone, dealPerson, yes, type CrmRecord } from './bitrix'
import { settings } from './store'
import { register } from './registrations'
import { matchEvent } from './event-match'

async function* pages(api: Awaited<ReturnType<typeof crm>>, method: string, filter: Record<string, unknown>, select: string[]) {
  for (let start = 0; ; start += 50) {
    const rows = await api.page(method, filter, select, start)
    for (const row of rows) yield row
    if (rows.length < 50) break
  }
}
/** Silent and repeatable: importing never enqueues customer communications. */
export async function importCrm(payload: Payload) {
  const log = await payload.create({ collection: 'automation-imports', data: { name: 'Участники и регистрации из Битрикс24', status: 'running' }, overrideAccess: true })
  const report = { contacts: 0, referralDeals: 0, eventDeals: 0, missingEmail: 0 }
  try {
    const saved = await settings(payload), api = await crm(payload), config = saved.config.referral
    const events = (await payload.find({ collection: 'events', limit: 100, overrideAccess: true })).docs
    const seen = new Set<string>()
    for (const filter of [{ [config.participantField]: 1 }, { [`!${config.linkField}`]: false }]) {
      for await (const contact of pages(api, 'crm.contact.list', filter, ['*', 'EMAIL', 'PHONE', 'UF_*'])) {
        if (seen.has(String(contact.ID))) continue
        seen.add(String(contact.ID))
        if (!yes(contact[config.participantField]) && !contact[config.linkField]) continue
        const record = await register(payload, 'referral', { name: crmName(contact), email: crmEmail(contact), phone: crmPhone(contact), crmContactId: String(contact.ID) }, undefined, true)
        await payload.update({ collection: 'referral-participants', id: record.id, data: { ...(yes(contact[config.participantField]) ? { status: 'active' as const } : {}), ...(contact[config.linkField] ? { referralUrl: String(contact[config.linkField]) } : {}), importedAt: new Date().toISOString(), sourceData: { contact } }, overrideAccess: true })
        report.contacts++
        if (!record.email) report.missingEmail++
      }
    }
    const queries = [...new Set([config.titleMatch, 'Регистрация в реферальной программе', ...events.map(e => e.crmTitleMatch).filter((s): s is string => Boolean(s))])]
    const dealsSeen = new Set<string>()
    for (const title of queries) for await (const deal of pages(api, 'crm.deal.list', { '%TITLE': title }, ['*', 'UF_*'])) {
      if (dealsSeen.has(String(deal.ID))) continue
      dealsSeen.add(String(deal.ID))
      const person = await dealPerson(api, deal)
      const event = matchEvent(events, deal, true)
      const flow = event ? 'event' : 'referral'
      const record = await register(payload, flow, { ...person, crmContactId: person.id, dealId: String(deal.ID) }, event?.slug, true)
      const confirmed = event ? deal.STAGE_ID === event.crmConfirmedStage : yes(person.contact[config.participantField]) || deal.STAGE_ID === config.confirmedStage
      const previous = record.sourceData as CrmRecord || {}
      const oldDeals = Array.isArray(previous.deals) ? previous.deals as CrmRecord[] : []
      await payload.update({ collection: flow === 'referral' ? 'referral-participants' : 'event-registrations', id: record.id, data: { ...(confirmed ? { status: event ? 'confirmed' : 'active' } : {}), importedAt: new Date().toISOString(), sourceData: { ...previous, contact: person.contact, deals: [...oldDeals.filter(d => d.ID !== deal.ID), deal] } }, overrideAccess: true })
      if (event) report.eventDeals++; else report.referralDeals++
    }
    await payload.update({ collection: 'automation-imports', id: log.id, data: { status: 'completed', report }, overrideAccess: true })
    return report
  } catch (error) {
    await payload.update({ collection: 'automation-imports', id: log.id, data: { status: 'failed', report: { ...report, error: error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[address]') : 'Ошибка импорта' } }, overrideAccess: true })
    throw error
  }
}
