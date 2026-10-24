import type { Event } from '../payload-types'
import type { CrmRecord } from './bitrix'
export function matchEvent(events: Event[], deal: CrmRecord, importing = false) {
  const title = String(deal.TITLE || '').toLowerCase()
  const candidates = events.filter(e => e.crmTitleMatch && title.includes(e.crmTitleMatch.toLowerCase()))
  const dated = candidates.find(e => title.includes(new Date(e.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: e.timezone || 'Europe/Moscow' })))
  if (dated) return dated
  // Undated historic registrations must never silently become guests of a future event.
  if (importing && candidates.length) return events.find(e => e.slug === 'factory-open-day-legacy') || candidates[0]
  return candidates.find(e => e.status === 'published') || candidates[0]
}
