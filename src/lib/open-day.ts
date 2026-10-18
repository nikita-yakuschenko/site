import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'

const fallbackDate = '14 ноября'

// Дата мероприятия задаётся в CMS, в блоке «День открытых дверей: первый экран».
export const openDayDate = cache(async (): Promise<string> => {
  await connection()
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
