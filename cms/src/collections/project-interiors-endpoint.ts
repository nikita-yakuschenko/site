import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'

export const projectInteriorsEndpoint: Endpoint = {
  path: '/interiors', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({
      collection: 'projects', limit: 1, depth: 1, req, overrideAccess: true,
      where: { and: [{ interiorsContentSource: { equals: 'database' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] },
      select: { interiors: true },
    })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Интерьеры не подключены' }, { status: 404 })
    const images = (record.interiors || []).map(row => typeof row.photo === 'object' && row.photo?.url
      ? new URL(row.photo.url, process.env.CMS_PUBLIC_URL).href : row.image).filter(Boolean)
    return Response.json({ images }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
