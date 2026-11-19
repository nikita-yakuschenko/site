import 'server-only'
import { cache } from 'react'
import { isBuiltItem, type BuiltItem } from './project-built-data'
import { catalogOrder } from './order'
import type { CatalogProject } from './types'

export const resolveProjectBuilt = cache(async (slug: string, publishedOnly = false): Promise<BuiltItem[] | null> => {
  if (!process.env.CMS_SITE_API_KEY) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const query = new URLSearchParams({ slug })
    if (publishedOnly) query.set('published', '1')
    const response = await fetch(`${origin}/api/projects/built?${query}`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.items) && data.items.every(isBuiltItem) ? data.items : null
  } catch { return null }
})

export async function resolveBuiltPhotoFallback(project: CatalogProject, ownItems: BuiltItem[] | null, catalog: CatalogProject[], seed: string): Promise<BuiltItem[]> {
  if ((ownItems === null && (project.built?.length || project.hasBuiltPhotos)) || ownItems?.some(item => item.type === 'photo')) return []

  const candidates = catalog
    .filter(item => item.hasBuiltPhotos === true && item.technology === project.technology && item.slug !== project.slug)
    .map(({ slug }) => ({ id: slug }))
  const [donor] = catalogOrder(candidates, seed)
  if (!donor) return []

  const items = await resolveProjectBuilt(donor.id, true)
  return items?.filter(item => item.type === 'photo') ?? []
}
