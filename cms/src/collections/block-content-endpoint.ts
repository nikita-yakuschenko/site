import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'

type MediaValue = { url?: string | null } | string | null | undefined

function mediaURL(image: MediaValue) {
  if (!image || typeof image === 'string' || !image.url) return ''
  return new URL(image.url, process.env.CMS_PUBLIC_URL || 'http://localhost:3001').href
}

// The public site reads saved block copy. The admin API stays staff-only.
export const blockContentEndpoint: Endpoint = {
  path: '/content', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const key = new URL(req.url || '').searchParams.get('key') || ''
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(key)) return Response.json({ error: 'Некорректный ключ' }, { status: 400 })
    const result = await req.payload.find({ collection: 'blocks', where: { key: { equals: key } }, limit: 1, depth: 1, overrideAccess: true, req })
    const parts = (result.docs[0]?.parts || []).map(part => ({
      key: part.key,
      title: part.title || '',
      text: part.text || '',
      textMore: part.textMore || '',
      href: part.href || '',
      image: mediaURL(part.image),
      imageMobile: mediaURL(part.imageMobile),
    }))
    return Response.json({ parts }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
