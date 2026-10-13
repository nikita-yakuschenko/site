import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'

export const projectExteriorsEndpoint: Endpoint = {
  path: '/exteriors', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({
      collection: 'projects', limit: 1, depth: 1, req, overrideAccess: true,
      where: { and: [{ exteriorsContentSource: { equals: 'database' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] },
      select: { exteriors: true },
    })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Фасады не подключены' }, { status: 404 })
    const rows = record.exteriors || []
    const primary = rows.find(row => row.isPrimary) || rows[0]
    const ordered = primary ? [primary, ...rows.filter(row => row !== primary)] : []
    const images = ordered.map(row => typeof row.photo === 'object' && row.photo?.url
      ? new URL(row.photo.url, process.env.CMS_PUBLIC_URL).href : row.image).filter(Boolean)
    return Response.json({ images }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
