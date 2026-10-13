import 'server-only'
import { cache } from 'react'
import { isHeroImage } from './project-hero-data'

const resolveProjectGallery = cache(async (slug: string, gallery: 'exteriors' | 'interiors') => {
  if (!process.env.CMS_SITE_API_KEY) return null
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/${gallery}?slug=${encodeURIComponent(slug)}`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data.images) && data.images.every(isHeroImage) ? data.images as string[] : null
  } catch { return null }
})

export const resolveProjectExteriors = (slug: string) => resolveProjectGallery(slug, 'exteriors')
export const resolveProjectInteriors = (slug: string) => resolveProjectGallery(slug, 'interiors')
