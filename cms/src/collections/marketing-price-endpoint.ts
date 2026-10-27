import { safeRequestError } from '../config/safe-request-error'
import { requireCMSRequestLimit } from '../config/request-limits'
import { readJsonLimited } from '../../../src/lib/request-security'
import type { Endpoint } from 'payload'
import { contentWriter } from '../access/staff'
import { parsePriceRows } from '../config/price-import'
import { marketingFileKind, matchMarketingCatalog } from '../config/marketing-prices'
import { parseMarketingWorkbook } from '../config/marketing-price-workbook'
import { technologyFromBadge } from '../../../src/lib/catalog/types'

export const marketingPricePreviewEndpoint: Endpoint = {
  path: '/preview-marketing', method: 'post', handler: async req => {
    if (!await contentWriter({ req })) return Response.json({ error: 'Нет доступа' }, { status: 403 })
    try {
      await requireCMSRequestLimit(req.payload, req, 'staff')
      const body = await readJsonLimited(req, 3 * 1024 * 1024) as Record<string, unknown>
      if (typeof body.filename !== 'string' || typeof body.file !== 'string') throw new Error('Нужен файл прайса')
      const data = Buffer.from(body.file, 'base64')
      if (!data.length || data.length > 2 * 1024 * 1024) throw new Error('Файл должен быть меньше 2 МБ')
      const parsed = await parseMarketingWorkbook(body.filename, data)
      const kind = marketingFileKind(body.filename)
      const projects = await req.payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: false, select: { name: true, slug: true, technologyBadge: true, recordType: true } })
      const catalog = projects.docs.flatMap(project => project.recordType === 'ready-home' || typeof project.name !== 'string' ? [] : [{ id: String(project.id), name: project.name, slug: typeof project.slug === 'string' ? project.slug : null, technology: technologyFromBadge(project.technologyBadge) }])
      const matched = matchMarketingCatalog(parsed, catalog, kind.technology)
      return Response.json({ rows: matched.rows.length ? parsePriceRows(matched.rows) : [], choices: parsed.choices, unmatched: matched.unmatched, issues: matched.issues })
    } catch (error) {
      return safeRequestError(error, data => req.payload.logger.error(data))
    }
  },
}
