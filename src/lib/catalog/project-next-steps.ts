import 'server-only'
import { cache } from 'react'
import { defaultNextStepsSettings, isNextStepsSettings } from './project-next-steps-data'

export const resolveProjectNextSteps = cache(async (slug: string) => {
  if (!process.env.CMS_SITE_API_KEY) return defaultNextStepsSettings
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/next-steps?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (response.ok) {
      const data = await response.json()
      if (isNextStepsSettings(data.settings)) return data.settings
    }
  } catch { /* Use the shared block's default arrangement if CMS is unavailable. */ }
  return defaultNextStepsSettings
})
