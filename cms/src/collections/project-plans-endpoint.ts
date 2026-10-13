import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { floorName, variantName } from '../config/project-plans'
export const projectPlansEndpoint: Endpoint = {
  path: '/plans', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({ collection: 'projects', limit: 1, depth: 1, req, overrideAccess: true,
      where: { and: [{ plansContentSource: { equals: 'database' } }, { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }] }, select: { plans: true } })
    const record = result.docs[0]
    if (!record) return Response.json({ error: 'Планировки не подключены' }, { status: 404 })
    const variants = (record.plans || []).map((variant, index) => ({ label: variantName(index),
      floors: (variant.floors || []).map((floor, floorIndex) => ({ label: floorName(floor.label, floorIndex),
        image: typeof floor.photo === 'object' && floor.photo?.url ? new URL(floor.photo.url, process.env.CMS_PUBLIC_URL).href : floor.image,
        rooms: (floor.rooms || []).map(room => ({ name: room.name, area: room.area })),
      })),
    }))
    return Response.json({ variants }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
