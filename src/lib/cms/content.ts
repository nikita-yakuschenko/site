import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { ContentRecord } from './react-content'

export const readCMSContent = cache(async (): Promise<ContentRecord[]> => {
  const secret = process.env.CMS_SITE_API_KEY
  if (!secret) return []
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const route = (await headers()).get('x-cms-page-route') || '/'
    const response = await fetch(`${origin}/api/blocks/content?all=1&route=${encodeURIComponent(route)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data.blocks) ? data.blocks : []
  } catch { return [] }
})
