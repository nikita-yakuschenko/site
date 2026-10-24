import { sql } from '@payloadcms/db-postgres'
import type { Endpoint, Field, PayloadRequest, RequiredDataFromCollectionSlug } from 'payload'
import { contentWriter } from '../access/staff'
import { projectCopyData } from '../config/project-copy'

type TransactionDB = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }

export async function copyProject(req: PayloadRequest, id: number) {
  const transactionID = await req.payload.db.beginTransaction()
  if (!transactionID) throw new Error('Не удалось начать копирование')
  const previousTransaction = req.transactionID, previousContext = req.context
  req.transactionID = transactionID
  req.context = { ...req.context, projectDuplication: true }
  try {
    const adapter = req.payload.db as unknown as { sessions: Record<string, { db: TransactionDB }> }
    await adapter.sessions[String(transactionID)].db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'project-copy:' + id}))`)
    const source = await req.payload.findByID({ collection: 'projects', id, draft: true, depth: 0, showHiddenFields: true, req, overrideAccess: false })
    const base = `${source.slug || 'project'}-copy`
    let slug = base, index = 2
    while ((await req.payload.count({ collection: 'projects', where: { slug: { equals: slug } }, req, overrideAccess: true })).totalDocs) slug = `${base}-${index++}`
    const fields = req.payload.collections.projects.config.fields as Field[]
    const data = projectCopyData(fields, source as unknown as Record<string, unknown>, slug) as unknown as RequiredDataFromCollectionSlug<'projects'>
    // All content comes from a readable saved record, never from client data.
    // Preserve protected source settings when a content editor makes a copy.
    const copy = await req.payload.create({ collection: 'projects', data, draft: true, req, overrideAccess: true })
    const prices = await req.payload.find({ collection: 'project-prices', where: { project: { equals: source.id } }, pagination: false, depth: 0, req, overrideAccess: false })
    for (const price of prices.docs) await req.payload.create({ collection: 'project-prices', data: { lookupKey: `${copy.id}:${price.configuration}:${price.region}`, project: copy.id, configuration: price.configuration, region: price.region, price: price.price, history: structuredClone(price.history) }, req, overrideAccess: true })
    await req.payload.db.commitTransaction(transactionID)
    return { doc: { id: copy.id, slug: copy.slug, name: copy.name }, pricesCopied: prices.totalDocs }
  } catch (error) {
    await req.payload.db.rollbackTransaction(transactionID)
    throw error
  } finally {
    req.transactionID = previousTransaction
    req.context = previousContext
  }
}

export const projectCopyEndpoint: Endpoint = {
  path: '/:id/copy', method: 'post', handler: async req => {
    if (!await contentWriter({ req })) return Response.json({ error: 'Нет прав на создание проекта' }, { status: 403 })
    if (req.headers.get('origin') !== new URL(process.env.CMS_PUBLIC_URL || req.url!).origin) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 })
    const id = Number(req.routeParams?.id)
    if (!Number.isSafeInteger(id) || id <= 0) return Response.json({ error: 'Некорректный ID проекта' }, { status: 400 })
    try { return Response.json(await copyProject(req, id), { status: 201 }) }
    catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 500
      req.payload.logger.error({ err: error }, 'Не удалось дублировать проект')
      return Response.json({ error: status === 404 ? 'Проект не найден' : 'Не удалось дублировать проект. Попробуйте ещё раз.' }, { status: status === 404 ? 404 : 500 })
    }
  },
}
