import type { Endpoint } from 'payload'
import { authenticated } from '../access/staff'
import { catalogYml } from '../config/catalog-yml'

export const projectYmlEndpoint: Endpoint = {
  path: '/export-yml', method: 'post', handler: async req => {
    try {
      if (!await authenticated({ req })) return Response.json({ error: 'Нет доступа к выгрузке каталога' }, { status: 403 })
      // draft:false reads the live document, never the latest draft version.
      const projects = await req.payload.find({ collection: 'projects', draft: false, pagination: false, depth: 1, sort: 'id', req, overrideAccess: false, where: { _status: { equals: 'published' } } })
      const prices = await req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false, where: { and: [{ region: { equals: 'nn' } }, { configuration: { equals: 'standard' } }] } })
      const result = catalogYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL)
      if (!result.count) return Response.json({ error: 'Нет опубликованных проектов с корректной ценой, технологией и изображением' }, { status: 422 })
      return new Response(result.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': 'attachment; filename="avgst-catalog.yml"', 'Cache-Control': 'no-store', 'X-Export-Count': String(result.count), 'X-Export-Skipped': String(result.skipped) } })
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML export failed' })
      return Response.json({ error: 'Не удалось сформировать YML. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}
