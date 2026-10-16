import type { Endpoint } from 'payload'
import { contentWriter } from '../access/staff'
import { parsePriceRows } from '../config/price-import'
import { marketingFileKind, priceNameKey } from '../config/marketing-prices'
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
      const byKey = new Map<string, string>()
      for (const project of projects.docs) {
        if (project.recordType === 'ready-home' || typeof project.name !== 'string') continue
        const key = priceNameKey(project.name)
        const choice = parsed.choices.find(item => priceNameKey(item.projectName) === key)
        if (!choice) continue
        if (isModularTechnology(project.technologyBadge) !== kind.modular) throw new Error(`«${choice.projectName}» совпало с проектом «${project.name}» другой технологии`)
        if (typeof project.slug !== 'string' || !project.slug) throw new Error(`У проекта «${project.name}» нет адреса`)
        if (byKey.has(key)) throw new Error(`Два проекта называются «${project.name}»`)
        byKey.set(key, project.slug)
      }
      const unmatched = parsed.choices.filter(choice => !byKey.has(priceNameKey(choice.projectName))).map(choice => choice.projectName)
      const rows = unmatched.length ? [] : parsePriceRows(parsed.rows.flatMap(row => {
        const projectSlug = byKey.get(priceNameKey(row.projectName))
        return projectSlug ? [{ projectSlug, configuration: row.configuration, region: row.region, price: row.price }] : []
      }))
      return Response.json({ rows, choices: parsed.choices, unmatched })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Не удалось прочитать файл' }, { status: 400 })
    }
  },
}
