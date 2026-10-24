import type { Event } from '../payload-types'
const stamp = (date: string) => new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')
export function calendar(event: Event) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Avangard Stroy//Events//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${event.slug}-${event.id}@avgst.ru`, `DTSTAMP:${stamp(event.updatedAt)}`, `DTSTART:${stamp(event.startsAt)}`, `DTEND:${stamp(event.endsAt)}`, `SUMMARY:${escape(event.title)}`, `LOCATION:${escape(event.address || '')}`, `DESCRIPTION:${escape(event.description || '')}`, ...(event.latitude != null && event.longitude != null ? [`GEO:${event.latitude};${event.longitude}`] : []), 'END:VEVENT', 'END:VCALENDAR']
  // RFC 5545 folds by UTF-8 octets, not JavaScript characters.
  return lines.map(line => { const out: string[] = []; let part = ''; for (const char of line) { if (Buffer.byteLength(part + char) > 73) { out.push(part); part = ' ' } part += char } out.push(part); return out.join('\r\n') }).join('\r\n') + '\r\n'
}
export function eventValues(event: Event, origin: string) {
  const zone = event.timezone || 'Europe/Moscow'
  return {
    event_title: event.title, event_date: new Date(event.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: zone }),
    event_time: new Date(event.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: zone }),
    address: event.address, phone: event.phone, route_url: event.routeUrl || `https://yandex.ru/maps/?rtext=~${event.latitude},${event.longitude}&rtt=auto`,
    programme: (event.programme || []).map(p => [p.time, p.title, p.description].filter(Boolean).join(' — ')).join('\n'),
    ics_url: `${origin}/api/automation/calendar?event=${encodeURIComponent(event.slug)}`,
    google_calendar_url: `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: event.title, dates: `${stamp(event.startsAt)}/${stamp(event.endsAt)}`, location: event.address || '', details: event.description || '' })}`,
  }
}
