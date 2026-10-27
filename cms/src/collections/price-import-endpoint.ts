import { safeRequestError } from '../config/safe-request-error'
import { requireCMSRequestLimit } from '../config/request-limits'
import { readJsonLimited } from '../../../src/lib/request-security'
import type { Endpoint } from 'payload'
import { contentWriter } from '../access/staff'
import { parsePriceRows } from '../config/price-import'
import { isModularTechnology, priceConfigurationKeys } from '../../../src/lib/catalog/configuration-rules'

export const priceImportEndpoint: Endpoint = {
  path: '/import', method: 'post', handler: async req => {
    if (!await contentWriter({ req })) return Response.json({ error: 'Нет доступа' }, { status: 403 })
    let rows; let dryRun
    try { await requireCMSRequestLimit(req.payload, req, 'staff'); const body = await readJsonLimited(req, 3 * 1024 * 1024) as Record<string, unknown>; rows = parsePriceRows(body.rows); dryRun = body.dryRun === true } catch (error) { return safeRequestError(error, data => req.payload.logger.error(data)) }
    const transactionID = await req.payload.db.beginTransaction()
    if (!transactionID) return Response.json({ error: 'Не удалось начать импорт' }, { status: 503 })
    req.transactionID = transactionID
    try {
      const projects = await req.payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: false })
      const prepared = rows.map(row => {
        const project = row.projectId
          ? projects.docs.find(item => String(item.id) === row.projectId)
          : projects.docs.find(item => item.slug === row.projectSlug || item.importKey === `catalog:${row.projectSlug}`)
        const name = row.label || row.projectSlug || row.projectId
        if (!project || project.recordType === 'ready-home') throw new Error(`Проект ${name} не найден`)
        if (!priceConfigurationKeys(isModularTechnology(project.technologyBadge)).includes(row.configuration)) throw new Error(`${name}: комплектация ${row.configuration} не подходит для технологии`)
        return { lookupKey: `${project.id}:${row.configuration}:${row.region}`, project: project.id, configuration: row.configuration, region: row.region, price: row.price }
      })
      if (new Set(prepared.map(row => row.lookupKey)).size !== prepared.length) throw new Error('Один проект повторён под разными адресами')
      if (!dryRun) for (const row of prepared) {
        const existing = await req.payload.find({ collection: 'project-prices', where: { lookupKey: { equals: row.lookupKey } }, limit: 1, req, overrideAccess: false })
        if (existing.docs[0]) await req.payload.update({ collection: 'project-prices', id: existing.docs[0].id, data: row, req, overrideAccess: false })
        else await req.payload.create({ collection: 'project-prices', data: row, req, overrideAccess: false })
      }
      await req.payload.db.commitTransaction(transactionID)
      return Response.json({ validated: prepared.length, updated: dryRun ? 0 : prepared.length, dryRun })
    } catch (error) {
      await req.payload.db.rollbackTransaction(transactionID)
      return safeRequestError(error, data => req.payload.logger.error(data))
    }
  },
}
