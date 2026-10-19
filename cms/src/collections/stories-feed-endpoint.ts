import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { detectBuiltVideo, type BuiltVideo } from '../config/built-media'

export type PublicStory = {
  slug: string
  heading: string
  subtitle: string
  place: string
  year: number
  kind: 'family' | 'business'
  binding: 'catalog' | 'individual' | 'discontinued'
  duration: string
  poster: string
  video: BuiltVideo | null
  project: { slug: string; name: string; href: string; image: string } | null
}

export const storiesFeedEndpoint: Endpoint = {
  path: '/feed', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const result = await req.payload.find({
      collection: 'stories', pagination: false, sort: '-year', depth: 1, req, overrideAccess: true,
      where: { _status: { equals: 'published' } },
    })
    const mediaURL = (photo: unknown, fallback?: string | null) => {
      const url = typeof photo === 'object' && photo && 'url' in photo && typeof photo.url === 'string' ? photo.url : fallback
      return url ? new URL(url, process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru').href : ''
    }
    const items: PublicStory[] = result.docs.flatMap(doc => {
      if (!doc.slug || !doc.heading || !doc.place || !doc.year) return []
      const rows = doc.media || []
      const primary = rows.find(row => row.isPrimary) || rows[0]
      const videoRow = rows.find(row => row.type === 'video')
      const video = videoRow ? detectBuiltVideo(videoRow.videoUrl) : null
      const poster = mediaURL(primary?.photo, primary?.image) || mediaURL(videoRow?.photo, videoRow?.image)
      const linked = doc.project && typeof doc.project === 'object' ? doc.project as { slug?: string; name?: string; imageUrl?: string | null; desktopImage?: unknown } : null
      const project = linked?.slug && linked.name
        ? { slug: linked.slug, name: linked.name, href: `/catalog/${linked.slug}`, image: mediaURL(linked.desktopImage, linked.imageUrl) }
        : null
      return [{
        slug: doc.slug,
        heading: doc.heading,
        subtitle: doc.subtitle || '',
        place: doc.place,
        year: Number(doc.year),
        kind: doc.customerKind === 'business' ? 'business' : 'family',
        binding: doc.binding === 'individual' || doc.binding === 'discontinued' ? doc.binding : 'catalog',
        duration: typeof (doc as { duration?: string }).duration === 'string' ? (doc as { duration?: string }).duration! : '',
        poster,
        video,
        project: doc.binding === 'catalog' ? project : null,
      }]
    })
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
