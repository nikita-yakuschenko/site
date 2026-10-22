import type { Endpoint } from 'payload'
import { authenticated } from '../access/staff'
import { catalogYml } from '../config/catalog-yml'
import { isPriceKind, priceKindsInForm, summaryConfiguration } from '../config/price-kinds'

const publishedProjects = (req: Parameters<Endpoint['handler']>[0]) => req.payload.find({ collection: 'projects', draft: false, pagination: false, depth: 1, sort: 'id', req, overrideAccess: false, where: { _status: { equals: 'published' } } })

export const projectYmlOptionsEndpoint: Endpoint = {
  path: '/export-yml/options', method: 'get', handler: async req => {
    try {
      if (!await authenticated({ req })) return Response.json({ error: 'Нет доступа к выгрузке каталога' }, { status: 403 })
      const [projects, prices] = await Promise.all([
        publishedProjects(req),
        req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false }),
      ])
      const options = priceKindsInForm.map(kind => ({ value: kind.value, label: kind.label, count: catalogYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL, kind.value).count })).filter(kind => kind.count > 0)
      return Response.json({ options }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML price options failed' })
      return Response.json({ error: 'Не удалось получить доступные типы цен. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}

export const projectYmlEndpoint: Endpoint = {
  path: '/export-yml', method: 'post', handler: async req => {
    try {
      if (!await authenticated({ req })) return Response.json({ error: 'Нет доступа к выгрузке каталога' }, { status: 403 })
      const body = await req.json?.().catch(() => null)
      const priceKind = body?.priceKind ?? 'nn'
      if (!isPriceKind(priceKind)) return Response.json({ error: 'Неизвестный тип цены' }, { status: 400 })
      // draft:false reads the live document, never the latest draft version.
      const projects = await publishedProjects(req)
      const prices = await req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false, where: { and: [{ region: { equals: priceKind } }, { configuration: { equals: summaryConfiguration(priceKind) } }] } })
      const result = catalogYml(projects.docs, prices.docs, new Date(), process.env.CMS_PUBLIC_URL, priceKind)
      if (!result.count) return Response.json({ error: 'Нет опубликованных проектов с корректной ценой, технологией и изображением' }, { status: 422 })
      const filename = priceKind === 'nn' ? 'avgst-catalog.yml' : `avgst-catalog-${priceKind}.yml`
      return new Response(result.xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store', 'X-Export-Count': String(result.count), 'X-Export-Skipped': String(result.skipped) } })
    } catch (error) {
      req.payload.logger.error({ err: error, msg: 'Catalog YML export failed' })
      return Response.json({ error: 'Не удалось сформировать YML. Попробуйте ещё раз.' }, { status: 500 })
    }
  },
}
