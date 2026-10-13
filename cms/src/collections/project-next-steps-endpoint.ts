import type { Endpoint } from 'payload'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { normalizeNextStepsSettings } from '../config/next-steps-settings'

export const projectNextStepsEndpoint: Endpoint = {
  path: '/next-steps', method: 'get', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    const result = await req.payload.find({ collection: 'projects', limit: 1, depth: 0, req, overrideAccess: true,
      where: { or: [{ slug: { equals: slug } }, { importKey: { equals: `catalog:${slug}` } }] }, select: { nextStepsSettings: true } })
    if (!result.docs[0]) return Response.json({ error: 'Проект не найден' }, { status: 404 })
    return Response.json({ settings: normalizeNextStepsSettings(result.docs[0].nextStepsSettings) }, { headers: { 'Cache-Control': 'no-store' } })
  },
}
