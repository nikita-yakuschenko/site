import type { Endpoint } from 'payload'
import { contentWriter } from '../access/staff'
import { parsePriceRows } from '../config/price-import'
import { marketingFileKind, matchMarketingCatalog } from '../config/marketing-prices'
import { parseMarketingWorkbook } from '../config/marketing-price-workbook'
import { isModularTechnology } from '../../../src/lib/catalog/configuration-rules'

export const marketingPricePreviewEndpoint: Endpoint = {
  path: '/preview-marketing', method: 'post', handler: async req => {
    if (!await contentWriter({ req })) return Response.json({ error: 'Нет доступа' }, { status: 403 })
    try {
      const body = await req.json!()
      if (typeof body.filename !== 'string' || typeof body.file !== 'string') throw new Error('Нужен файл прайса')
      const data = Buffer.from(body.file, 'base64')
      if (!data.length || data.length > 2 * 1024 * 1024) throw new Error('Файл должен быть меньше 2 МБ')
      const parsed = await parseMarketingWorkbook(body.filename, data)
      const kind = marketingFileKind(body.filename)
      const projects = await req.payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: false, select: { name: true, slug: true, technologyBadge: true, recordType: true } })
      const catalog = projects.docs.flatMap(project => project.recordType === 'ready-home' || typeof project.name !== 'string' ? [] : [{ id: String(project.id), name: project.name, slug: typeof project.slug === 'string' ? project.slug : null, modular: isModularTechnology(project.technologyBadge) }])
      const matched = matchMarketingCatalog(parsed, catalog, kind.modular)
      return Response.json({ rows: matched.rows.length ? parsePriceRows(matched.rows) : [], choices: parsed.choices, unmatched: matched.unmatched, issues: matched.issues })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Не удалось прочитать файл' }, { status: 400 })
    }
  },
}
