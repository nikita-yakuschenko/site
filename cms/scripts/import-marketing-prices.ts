/** Preview by default. Apply exact workbook prices with --apply; keep price history. */
import fs from 'node:fs'
import path from 'node:path'
process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.CMS_MAINTENANCE = '1'
const { getPayload, createLocalReq } = await import('payload')
const { default: config } = await import('../src/payload.config')
const { parseMarketingWorkbook } = await import('../src/config/marketing-price-workbook')
const { marketingFileKind, matchMarketingCatalog } = await import('../src/config/marketing-prices')
const { technologyFromBadge } = await import('../../src/lib/catalog/types')
const { mergePriceRows } = await import('../src/config/price-import')
const files = process.argv.slice(2).filter(arg => arg !== '--apply')
if (!files.length) throw new Error('Укажите файлы XLSX; --apply применяет цены')
const p = await getPayload({ config })
try {
  const projects = await p.find({ collection: 'projects', pagination: false, depth: 0 })
  const catalog = projects.docs.filter(project => project.recordType === 'project').map(project => ({ id: String(project.id), name: project.name, slug: project.slug, technology: technologyFromBadge(project.technologyBadge) }))
  const groups = []
  const reports = []
  for (const file of files) {
    const filename = path.basename(file)
    const parsed = await parseMarketingWorkbook(filename, fs.readFileSync(file))
    const kind = marketingFileKind(filename)
    const matched = matchMarketingCatalog(parsed, catalog, kind.technology)
    if (matched.issues.length) throw new Error(JSON.stringify(matched.issues))
    groups.push(matched.rows)
    reports.push({ filename, technology: kind.technology, projects: new Set(matched.rows.map(row => row.projectId)).size, prices: matched.rows.length, unmatched: matched.unmatched, layouts: parsed.choices.filter(choice => choice.skipped.length) })
  }
  const rows = mergePriceRows(groups)
  if (!rows.length) throw new Error('Нет цен для записи')
  console.log(JSON.stringify({ apply: process.argv.includes('--apply'), prices: rows.length, reports }))
  if (process.argv.includes('--apply')) {
    const transactionID = await p.db.beginTransaction()
    if (!transactionID) throw new Error('Transaction unavailable')
    const req = await createLocalReq({ req: { transactionID } }, p)
    let updated = 0, unchanged = 0, created = 0
    try {
      for (const row of rows) {
        const project = projects.docs.find(project => String(project.id) === row.projectId)
        if (!project) throw new Error('Проект не найден')
        const lookupKey = `${project.id}:${row.configuration}:${row.region}`
        const existing = await p.find({ collection: 'project-prices', where: { lookupKey: { equals: lookupKey } }, limit: 1, depth: 0, req })
        if (existing.docs[0]?.price === row.price) { unchanged++; continue }
        const data = { lookupKey, project: project.id, configuration: row.configuration, region: row.region, price: row.price }
        if (existing.docs[0]) { await p.update({ collection: 'project-prices', id: existing.docs[0].id, data, req }); updated++ }
        else { await p.create({ collection: 'project-prices', data, req }); created++ }
      }
      await p.db.commitTransaction(transactionID)
      console.log(JSON.stringify({ committed: true, updated, created, unchanged }))
    } catch (error) { await p.db.rollbackTransaction(transactionID); throw error }
  }
} finally { await p.destroy() }
process.exit(0)
