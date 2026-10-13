import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { resolveBuiltItems } from '../config/built-media'

export const projectBuiltEndpoint: Endpoint = {
  path: '/built', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({
      collection: 'projects', limit: 1, depth: 1, req, overrideAccess: true,
      where: { and: [{ builtContentSource: { equals: 'database' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] },
      select: { built: true },
    })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Построенные дома не подключены' }, { status: 404 })
    const items = await resolveBuiltItems(record.built || [], async photo => typeof photo === 'object' && photo && 'url' in photo && typeof photo.url === 'string' ? new URL(photo.url, process.env.CMS_PUBLIC_URL).href : null)
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
