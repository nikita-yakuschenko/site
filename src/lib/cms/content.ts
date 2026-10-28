import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { ContentRecord } from './react-content'
import { readCMSJSON } from './request'
import { decodeObject } from '../../server/cms-request'
import { unstable_rethrow } from 'next/navigation'

export const readCMSContent = cache(async (pageRoute?: string): Promise<ContentRecord[]> => {
  const secret = process.env.CMS_SITE_API_KEY
  if (!secret) return []
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const route = pageRoute || (await headers()).get('x-cms-page-route') || '/'
    return await readCMSJSON('content', `${origin}/api/blocks/content?all=1&route=${encodeURIComponent(route)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) }, data => {
      const { blocks } = decodeObject(data)
      if (!Array.isArray(blocks)) throw new Error('Invalid CMS content')
      return blocks as ContentRecord[]
    })
  } catch (error) { unstable_rethrow(error); return [] }
})
