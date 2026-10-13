import type { Endpoint } from 'payload'
import { contentWriter } from '../access/staff'
import { projectBlockOrder, validProjectOrder, completeProjectOrder, normalizeProjectOrder } from '../config/project-order'

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
  { path: '/apply-order-to-all', method: 'post', handler: async req => {
    if (!await contentWriter({ req })) return Response.json({ error: 'Нет доступа' }, { status: 403 })
    const body = await req.json!()
    if (!validProjectOrder(body.order)) return Response.json({ error: 'Некорректный порядок блоков' }, { status: 400 })
    const transactionID = await req.payload.db.beginTransaction()
    if (!transactionID) return Response.json({ error: 'Не удалось начать сохранение' }, { status: 503 })
    req.transactionID = transactionID
    try {
      const result = await req.payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: false })
      for (const project of result.docs) await req.payload.update({ collection: 'projects', id: project.id, data: { blockOrder: body.order }, req, overrideAccess: false })
      const templates = await req.payload.find({ collection: 'pages', where: { source: { equals: 'src/app/catalog/[slug]/page.tsx' } }, depth: 1, req, overrideAccess: false })
      for (const page of templates.docs) {
        const rows = page.layout || []
        const key = (row: typeof rows[number]) => {
          const value = typeof row.component.value === 'object' && 'key' in row.component.value ? row.component.value.key : null
          return value === 'ContactsSection' ? 'contactsSection' : value
        }
        const ordered = body.order.flatMap((name: string) => rows.filter(row => key(row) === name))
        const shellBefore = rows.filter(row => ['technicalHeader', 'mainHeader', 'projectHero'].includes(key(row) || ''))
        const shellAfter = rows.filter(row => !body.order.includes(key(row)) && !shellBefore.includes(row))
        await req.payload.update({ collection: 'pages', id: page.id, data: { layout: [...shellBefore, ...ordered, ...shellAfter] }, req, overrideAccess: false })
      }
      await req.payload.db.commitTransaction(transactionID)
      return Response.json({ updated: result.docs.length })
    } catch {
      await req.payload.db.rollbackTransaction(transactionID)
      return Response.json({ error: 'Не удалось сохранить порядок' }, { status: 500 })
    }
  } },
]
