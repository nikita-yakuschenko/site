import 'server-only'
import { isPlanVariants } from './project-plans-data'
import type { PlanVariant } from './types'
export async function resolveProjectPlans(slug: string): Promise<PlanVariant[] | null> {
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/plans?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const { variants } = await response.json()
    return isPlanVariants(variants) ? variants : null
  } catch { return null }
}
