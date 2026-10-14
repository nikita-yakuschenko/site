import { createHash, timingSafeEqual } from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

export function authorizeSiteRequest(req: PayloadRequest) {
  const key = process.env.CMS_SITE_API_KEY
  const supplied = req.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!key || key.length < 32) return Response.json({ error: 'Источник не настроен' }, { status: 503 })
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(key), digest(supplied))) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  return null
}

export const projectHeroEndpoint: Endpoint = {
  path: '/hero', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({
      collection: 'projects', limit: 1, depth: 1, req, overrideAccess: true,
      where: { and: [{ heroContentSource: { equals: 'database' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] },
      select: { code: true, importKey: true, slug: true, name: true, technologyBadge: true, areaValue: true, floorsValue: true, bedrooms: true, bathrooms: true, imageUrl: true, mobileImageUrl: true, desktopImage: true, mobileImage: true },
    })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Главный экран не подключён' }, { status: 404 })
    const mediaURL = (image: typeof record.desktopImage) => image && typeof image === 'object' && image.url
      ? new URL(image.url, process.env.CMS_PUBLIC_URL).href : null
    return Response.json({ projectId: record.code, slug: record.slug, name: record.name, technologyBadge: record.technologyBadge, areaValue: record.areaValue, floorsValue: record.floorsValue, bedrooms: record.bedrooms, bathrooms: record.bathrooms, imageUrl: mediaURL(record.desktopImage) || record.imageUrl, mobileImageUrl: mediaURL(record.mobileImage) || record.mobileImageUrl || null }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
