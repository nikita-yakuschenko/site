import 'server-only'
import { cache } from 'react'
import { isBuiltItem, type BuiltItem } from './project-built-data'

export const resolveProjectBuilt = cache(async (slug: string): Promise<BuiltItem[] | null> => {
  if (!process.env.CMS_SITE_API_KEY) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/built?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.items) && data.items.every(isBuiltItem) ? data.items : null
  } catch { return null }
})
