/** One-time, idempotent migration of the audited 2026-10-26 catalogue. Dry run unless --apply. */
process.env.CMS_SEED = '0'
process.env.PAYLOAD_DB_PUSH = 'false'
process.env.CMS_MAINTENANCE = '1'
const { getPayload, createLocalReq } = await import('payload')
const { sql } = await import('@payloadcms/db-postgres')
const { default: config } = await import('../src/payload.config')
const { projectCopyData } = await import('../src/config/project-copy')
const p = await getPayload({ config })
const ids = [2,3,4,5,8,9,10,11,12,13,14,15,17,19,20,21,23,24,25,26,27,28,29,30,31,32,33]
const all = await p.find({ collection: 'projects', pagination: false, depth: 0, showHiddenFields: true })
const plan = ids.map(id => {
  const source = all.docs.find(doc => doc.id === id)
  if (!source) throw new Error(`Missing original ${id}`)
  const slug = id === 20 ? 'scandy-89' : source.slug.replace(/^pkd-/, '')
  const target = all.docs.find(doc => doc.id !== id && doc.slug === slug && doc.technologyBadge === 'Каркасный')
  // Camelot's original was edited instead of its duplicate: restore original identity.
  const camelot = id === 12 ? all.docs.find(doc => doc.slug === 'pkd-camelot-101' && doc.id === 64) : undefined
  const existing = target || camelot
  const archived = all.docs.find(doc => doc.slug === `pkd-${slug}` && doc.id !== id && doc.id !== camelot?.id)
  if (archived) throw new Error(`Archive slug collision: ${slug}`)
  if (source.technologyBadge !== 'Панельно-каркасный' && id !== 12) throw new Error(`Unexpected technology: ${id}`)
  return { source, slug, existing }
})
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', originals: plan.length, reuse: plan.filter(row => row.existing).length, create: plan.filter(row => !row.existing).length, pairs: plan.map(row => ({ originalId: row.source.id, slug: row.slug, frameId: row.existing?.id ?? null, originalCode: row.source.code })) }))
if (process.argv.includes('--apply')) {
  const transactionID = await p.db.beginTransaction()
  if (!transactionID) throw new Error('Transaction unavailable')
  const req = await createLocalReq({ req: { transactionID, context: { projectDuplication: true } } }, p)
  const db = (p.db as unknown as { sessions: Record<string, { db: { execute: (query: ReturnType<typeof sql>) => Promise<{ rows: Record<string, unknown>[] }> } }> }).sessions[String(transactionID)].db
  try {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('frame-catalogue-20261026'))`)
    // Lock and verify the complete audited set before changing any address.
    const before = await db.execute(sql`SELECT id,slug,code,view_count,like_count,share_count FROM projects WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`,`)}) FOR UPDATE`)
    for (const row of plan) {
      const saved = before.rows.find(doc => Number(doc.id) === row.source.id)
      if (!saved || saved.slug !== row.source.slug || saved.code !== row.source.code) throw new Error(`Catalogue changed since planning: ${row.source.id}`)
    }
    const report = []
    for (const { source, slug, existing } of plan) {
      if (source.id === 12 && existing?.slug === `pkd-${slug}`) await p.update({ collection: 'projects', id: existing.id, data: { slug: `migration-${slug}` }, req })
      await p.update({ collection: 'projects', id: source.id, data: { slug: `pkd-${slug}`, technologyBadge: 'Панельно-каркасный', _status: 'draft' }, req })
      // Payload represents unpublished documents as drafts internally; this marker
      // makes the distinct lifecycle state explicit in the admin table and card.
      await db.execute(sql`UPDATE projects SET unpublished_at = coalesce(unpublished_at, now()) WHERE id = ${source.id}`)
      await db.execute(sql`UPDATE _projects_v SET version_unpublished_at = (SELECT unpublished_at FROM projects WHERE id = ${source.id}) WHERE parent_id = ${source.id} AND latest = true`)
      let frameId = existing?.id
      if (existing) {
        if (source.id === 12) await p.update({ collection: 'projects', id: existing.id, data: { slug, technologyBadge: 'Каркасный', _status: 'published' }, req })
      } else {
        const data = projectCopyData(p.collections.projects.config.fields, source as unknown as Record<string, unknown>, slug)
        const duplicate = await p.create({ collection: 'projects', data: { ...data, technologyBadge: 'Каркасный', _status: 'published' } as never, req })
        frameId = duplicate.id
        const prices = await p.find({ collection: 'project-prices', where: { project: { equals: source.id } }, pagination: false, depth: 0, req })
        for (const price of prices.docs) await p.create({ collection: 'project-prices', data: { lookupKey: `${frameId}:${price.configuration}:${price.region}`, project: frameId, configuration: price.configuration, region: price.region, price: price.price, history: structuredClone(price.history) }, req })
      }
      report.push({ originalId: source.id, frameId, slug, oldSlug: `pkd-${slug}`, originalCode: source.code })
    }
    const after = await db.execute(sql`SELECT id,code,view_count,like_count,share_count FROM projects WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`,`)})`)
    for (const old of before.rows) {
      const now = after.rows.find(row => row.id === old.id)!
      for (const key of ['code','view_count','like_count','share_count']) if (String(old[key]) !== String(now[key])) throw new Error(`Original ${old.id} changed ${key}`)
    }
    await p.db.commitTransaction(transactionID)
    console.log(JSON.stringify({ committed: true, report }))
  } catch (error) { await p.db.rollbackTransaction(transactionID); throw error }
}
await p.destroy()

export {}
process.exit(0)
