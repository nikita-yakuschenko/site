import type { Endpoint } from 'payload'
import { projectBlockOrder, completeProjectOrder, normalizeProjectOrder } from '../config/project-order'

export const projectOrderEndpoints: Endpoint[] = [
  { path: '/page-order', method: 'get', handler: async req => {
    const slug = new URL(req.url!).searchParams.get('slug')
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return Response.json({ error: 'Некорректный адрес' }, { status: 400 })
    // This public endpoint exposes only component ordering, never catalog content.
    const result = await req.payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1, select: { blockOrder: true }, req, overrideAccess: true })
    const order = result.docs[0]?.blockOrder
    let fallback = projectBlockOrder
    if (!completeProjectOrder(order)) {
      const templates = await req.payload.find({ collection: 'pages', where: { source: { equals: 'src/app/catalog/[slug]/page.tsx' } }, limit: 1, depth: 1, req, overrideAccess: true })
      const keys = (templates.docs[0]?.layout || []).flatMap(row => {
        const key = typeof row.component.value === 'object' && 'key' in row.component.value ? row.component.value.key || '' : ''
        const canonical = key === 'ContactsSection' ? 'contactsSection' : key
        return projectBlockOrder.includes(canonical) ? [canonical] : []
      })
      fallback = [...new Set([...keys, ...projectBlockOrder])]
    }
    return Response.json({ order: normalizeProjectOrder(completeProjectOrder(order) ? order : fallback) }, { headers: { 'Cache-Control': 'no-store' } })
  } },
]
