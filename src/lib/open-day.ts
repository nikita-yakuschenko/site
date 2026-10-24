import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'

const fallbackDate = '14 ноября'
export type OpenDayEvent = {
  title: string; slug: string; startsAt: string; endsAt: string; timezone?: string; status: string; registrationEnabled: boolean
  description?: string; programme?: { time?: string; title: string; description?: string }[]
  address?: string; landmark?: string; latitude?: number; longitude?: number; markerLabel?: string; routeUrl?: string; phone?: string
}
export const openDayEvent = cache(async (): Promise<OpenDayEvent | null> => {
  await connection()
  if (!process.env.CMS_SITE_API_KEY) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/automation/event?slug=factory-open-day`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    return response.ok ? await response.json() as OpenDayEvent : null
  } catch { return null }
})

// Дата мероприятия задаётся в CMS, в блоке «День открытых дверей: первый экран».
export const openDayDate = cache(async (): Promise<string> => {
  await connection()
  const event = await openDayEvent()
  if (event) return new Date(event.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: event.timezone || 'Europe/Moscow' })
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return fallbackDate
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/blocks/content?key=FactoryOpenDayHero`, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return fallbackDate
    const data = await response.json()
    const part = Array.isArray(data.parts) ? data.parts.find((item: { key?: string }) => item.key === 'openDay.date') : null
    const text = part && typeof part.text === 'string' ? part.text.trim() : ''
    return text || fallbackDate
  } catch { return fallbackDate }
})
