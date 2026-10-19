import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { detectBuiltVideo, type BuiltVideo } from '../config/built-media'

export type PublicStoryCard = {
  mark: 'individual' | 'discontinued' | null
  title: string
  text: string
  image: string
  href: string
  label: string
}

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
  card: PublicStoryCard | null
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
      const kind = doc.customerKind === 'business' ? 'business' as const : 'family' as const
      const binding = doc.binding === 'individual' || doc.binding === 'discontinued' ? doc.binding : 'catalog' as const
      const fallbackHref = kind === 'business' ? '/business' : '/catalog'
      const fallbackLabel = kind === 'business' ? 'Решения для бизнеса' : 'Смотреть проекты'
      let card: PublicStoryCard | null = null
      if (binding === 'catalog') {
        const linked = doc.project && typeof doc.project === 'object' ? doc.project as { slug?: string; name?: string; imageUrl?: string | null; desktopImage?: unknown } : null
        if (linked?.slug && linked.name) {
          card = {
            mark: null,
            title: linked.name,
            text: doc.subtitle || '',
            image: mediaURL(linked.desktopImage, linked.imageUrl) || poster,
            href: `/catalog/${linked.slug}`,
            label: 'Посмотреть проект',
          }
        }
      } else {
        const related = doc.relatedCard
        if (related?.enabled !== false) {
          card = {
            mark: binding,
            title: related?.title?.trim() || doc.heading,
            text: related?.text?.trim() || doc.subtitle || '',
            image: mediaURL(related?.image) || poster,
            href: fallbackHref,
            label: fallbackLabel,
          }
        }
      }
      return [{
        slug: doc.slug,
        heading: doc.heading,
        subtitle: doc.subtitle || '',
        place: doc.place,
        year: Number(doc.year),
        kind,
        binding,
        duration: typeof doc.duration === 'string' ? doc.duration : '',
        poster,
        video,
        card,
      }]
    })
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
