import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createLocalReq, getPayload } from 'payload'
import { projectBlockOrder } from '../src/config/project-order'
import { projectOrderEndpoints } from '../src/collections/project-order-endpoints'
if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const created: string[] = []
try {
  const admins = await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'super-admin' } }, { isBlocked: { equals: false } }] }, limit: 1, overrideAccess: true })
  assert(admins.docs[0])
  const req = await createLocalReq({ user: { ...admins.docs[0], collection: 'users' } }, payload)
  const catalog = await payload.find({ collection: 'projects', limit: 100, req, overrideAccess: false })
  for (const doc of catalog.docs.filter(doc => doc.name === 'Проверка' && /^verify-\d+$/.test(doc.slug) && !doc.importKey)) await payload.delete({ collection: 'projects', id: doc.id, req, overrideAccess: false })
  assert.equal(catalog.docs.filter(doc => doc.contentImported).length, 38)
  assert(catalog.docs.some(doc => doc.recordType === 'ready-home' && doc.readyHome?.salePrice))
  assert(catalog.docs.some(doc => doc.exteriors?.length && doc.floorPlans?.length))
  for (const doc of catalog.docs.filter(doc => doc.recordType === 'project' && doc.contentImported)) {
    assert.deepEqual(doc.configurations?.map(tier => tier.key), ['start', 'standard', 'project'])
  }
  const base = { name: 'Проверка', slug: `verify-${Date.now()}`, recordType: 'project' as const, technologyBadge: 'Панельно-каркасный' as const, series: 'barn' as const, areaValue: 100, floorsValue: 1, bedrooms: 3, bathrooms: 2, priceAmount: 1000000 }
  const project = await payload.create({ collection: 'projects', data: base, req, overrideAccess: false })
  created.push(project.id)
  const reordered = [...projectBlockOrder].reverse()
  await payload.update({ collection: 'projects', id: project.id, data: { blockOrder: reordered }, req, overrideAccess: false })
  const ordered = await payload.findByID({ collection: 'projects', id: project.id, req, overrideAccess: false })
  assert.deepEqual(ordered.blockOrder, reordered)
  await assert.rejects(payload.update({ collection: 'projects', id: project.id, data: { blockOrder: ['projectHero', ...projectBlockOrder] }, req, overrideAccess: false }))
  await assert.rejects(payload.update({ collection: 'projects', id: project.id, data: { blockOrder: [...projectBlockOrder.slice(1), projectBlockOrder[1]] }, req, overrideAccess: false }))
  const publicReq = await createLocalReq({ req: { url: `http://localhost:3001/api/projects/page-order?slug=${project.slug}` } }, payload)
  const publicResponse = await projectOrderEndpoints[0].handler(publicReq)
  assert.deepEqual((await publicResponse.json()).order, reordered)
  const denied = await projectOrderEndpoints[1].handler(publicReq)
  assert.equal(denied.status, 403)
  // Exercise the real bulk update and template update, then roll back the test transaction.
  const transactionID = await payload.db.beginTransaction()
  assert(transactionID)
  const beginTransaction = payload.db.beginTransaction
  const commitTransaction = payload.db.commitTransaction
  const rollbackTransaction = payload.db.rollbackTransaction
  payload.db.beginTransaction = async () => transactionID
  payload.db.commitTransaction = async id => { if (id !== transactionID) await commitTransaction.call(payload.db, id) }
  payload.db.rollbackTransaction = async id => { if (id !== transactionID) await rollbackTransaction.call(payload.db, id) }
  const allReq = await createLocalReq({ user: { ...admins.docs[0], collection: 'users' }, req: { transactionID, json: async () => ({ order: reordered }) } }, payload)
  try {
    const applied = await projectOrderEndpoints[1].handler(allReq)
    assert.equal(applied.status, 200)
    const all = await payload.find({ collection: 'projects', pagination: false, req: allReq, overrideAccess: false })
    for (const doc of all.docs) assert.deepEqual(doc.blockOrder, reordered)
    const inheritanceReq = await createLocalReq({ req: { transactionID, url: 'http://localhost:3001/api/projects/page-order?slug=new' } }, payload)
    const inherited = await projectOrderEndpoints[0].handler(inheritanceReq)
    const inheritedOrder = (await inherited.json()).order as string[]
    assert.deepEqual(inheritedOrder, reordered)
  } finally {
    payload.db.beginTransaction = beginTransaction
    payload.db.commitTransaction = commitTransaction
    payload.db.rollbackTransaction = rollbackTransaction
    await rollbackTransaction.call(payload.db, transactionID)
  }
  const source = catalog.docs.find(doc => doc.recordType === 'project' && doc.configurations?.length === 3)!
  const copied = JSON.parse(JSON.stringify(source.configurations, (key, value) => key === 'id' ? undefined : value)) as NonNullable<typeof source.configurations>
  const configurations = copied.map(tier => ({ ...tier, price: tier.key === 'standard' ? 4444000 : tier.price }))
  await payload.update({ collection: 'projects', id: project.id, data: { configurations }, req, overrideAccess: false })
  const priced = await payload.findByID({ collection: 'projects', id: project.id, req, overrideAccess: false })
  assert.equal(priced.priceAmount, 4444000)
  assert.equal(priced.configurations?.length, 3)
  assert.equal(priced.configurations?.[1].includes?.[0].text, source.configurations![1].includes?.[0].text)
  for (const field of ['bedrooms', 'bathrooms', 'floorsValue'] as const) {
    await assert.rejects(payload.update({ collection: 'projects', id: project.id, data: { [field]: 1.5 }, req, overrideAccess: false }))
    await assert.rejects(payload.update({ collection: 'projects', id: project.id, data: { [field]: -1 }, req, overrideAccess: false }))
  }
  await payload.update({ collection: 'projects', id: project.id, data: { bedrooms: 0, bathrooms: 0 }, req, overrideAccess: false })
  await payload.update({ collection: 'projects', id: project.id, data: { priceAmount: 2000000, exteriors: [{ image: '/test.jpg' }], plans: [{ label: 'План', rooms: [{ name: 'Кухня', area: '15' }] }] }, req, overrideAccess: false })
  const updated = await payload.findByID({ collection: 'projects', id: project.id, req, overrideAccess: false })
  assert.equal(updated.priceAmount, 4444000)
  assert.equal(updated.plans?.[0].rooms?.[0].name, 'Кухня')
  assert.equal(updated.exteriors?.[0].image, '/test.jpg')
  await assert.rejects(payload.update({ collection: 'projects', id: project.id, data: { recordType: 'ready-home' }, req, overrideAccess: false }))
  const home = await payload.update({ collection: 'projects', id: project.id, data: { recordType: 'ready-home', readyHome: { location: 'Гремячки', salePrice: 3000000, configurationLead: 'Готов к проживанию' } }, req, overrideAccess: false })
  assert.equal(home.recordType, 'ready-home')
  assert.equal(home.readyHome?.salePrice, 3000000)
  const invalid = { ...base, slug: `${base.slug}-invalid`, technologyBadge: 'Произвольная' }
  // Deliberately submit an invalid value to exercise server-side enum validation.
  await assert.rejects(payload.create({ collection: 'projects', data: invalid as typeof base, req, overrideAccess: false }))
  console.log('Каталог: импорт, сохранение контента, типы записей и списки проверены.')
} finally {
  for (const id of created) await payload.delete({ collection: 'projects', id, overrideAccess: true })
  await payload.destroy()
}
process.exit(0)
