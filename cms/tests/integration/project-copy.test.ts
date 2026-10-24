import assert from 'node:assert/strict'
import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { createLocalReq, getPayload } from 'payload'
import { createFirstAdmin } from '../../src/access/bootstrap'
import { copyProject, projectCopyEndpoint } from '../../src/collections/project-copy-endpoint'
import { projectCopyData } from '../../src/config/project-copy'
import { projectCatalogEndpoint } from '../../src/collections/project-catalog-endpoint'

test('complete project copies are independent drafts with atomic prices, unique slugs and separate catalogue entries', { skip: process.env.CMS_PROJECT_COPY_TEST_DATABASE !== 'true', timeout: 120000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
  process.env.CMS_MAINTENANCE = '1'
  const { default: config } = await import('../../src/payload.config')
  const p = await getPayload({ config }), suffix = randomUUID(), projects: number[] = [], users: number[] = []
  let admin = (await p.find({ collection: 'users', where: { role: { equals: 'super-admin' } }, limit: 1 })).docs[0]
  if (!admin) { await createFirstAdmin(p, { email: `admin-${suffix}@example.test`, password: randomUUID(), firstName: 'Тест', lastName: 'Админ' }); admin = (await p.find({ collection: 'users', where: { role: { equals: 'super-admin' } }, limit: 1 })).docs[0]; users.push(admin.id) }
  const adminReq = await createLocalReq({ user: { ...admin, collection: 'users' } }, p)
  try {
    const actor = await p.create({ collection: 'users', data: { email: `copy-${suffix}@example.test`, password: randomUUID(), firstName: 'Тест', lastName: 'Копия', role: 'editor' }, req: adminReq })
    users.push(actor.id)
    const user = { ...actor, collection: 'users' as const }
    const request = () => createLocalReq({ user }, p)
    const source = await p.create({ collection: 'projects', data: { name: 'Полный дубликат', slug: `copy-test-${suffix}`, recordType: 'project', technologyBadge: 'Панельно-каркасный', series: 'barn', areaValue: 138, floorsValue: 2, bedrooms: 4, bathrooms: 2, imageUrl: '/catalog/test/main.webp', mobileImageUrl: '/catalog/test/mobile.webp', _status: 'published', likeCount: 12, viewCount: 45, shareCount: 3, exteriors: [{ image: '/catalog/test/exterior.webp', isPrimary: true }], interiors: [{ image: '/catalog/test/interior.webp' }], built: [{ type: 'photo', image: '/catalog/test/built.webp', isPrimary: true }], plans: [{ floors: [{ image: '/catalog/test/plan.webp', rooms: [{ name: 'Спальня', area: '18,5' }] }] }], configurations: [{ key: 'standard', name: 'Стандартная', price: 5000000, lead: 'Комплектация', includes: [{ text: 'Стены' }], details: [{ title: 'Состав', groups: [{ title: 'Узел', items: [{ text: 'Материал' }] }] }] }], searchDescription: 'Описание проекта', about: [{ title: 'Дом', text: 'Содержимое', image: '/catalog/test/about.webp' }], nextStepsSettings: { enabled: true, order: 'secondary-first', visitEnabled: false, secondaryEnabled: true }, legacyConfigurations: { id: 'JSON-content-id', values: [1, 2] } } })
    projects.push(source.id)
    const price = await p.create({ collection: 'project-prices', data: { lookupKey: 'auto', project: source.id, configuration: 'standard', region: 'msk', price: 5500000 } })
    const originalPrice = await p.update({ collection: 'project-prices', id: price.id, data: { price: 5700000 } })
    const copies = await Promise.all([copyProject(await request(), source.id), copyProject(await request(), source.id)])
    projects.push(...copies.map(copy => copy.doc.id))
    assert.notEqual(copies[0].doc.slug, copies[1].doc.slug)
    assert.ok(copies.some(c => c.doc.slug === `${source.slug}-copy`))
    assert.ok(copies.some(c => c.doc.slug === `${source.slug}-copy-2`))
    const copy = await p.findByID({ collection: 'projects', id: copies[0].doc.id, depth: 0, draft: true })
    const fields = p.collections.projects.config.fields
    assert.deepEqual(projectCopyData(fields, copy as unknown as Record<string, unknown>, 'normalized'), projectCopyData(fields, source as unknown as Record<string, unknown>, 'normalized'))
    assert.equal(copy._status, 'draft'); assert.equal(copy.name, source.name); assert.notEqual(copy.code, source.code)
    assert.equal(copy.likeCount, 0); assert.equal(copy.viewCount, 0); assert.equal(copy.importKey, null)
    assert.notEqual(copy.plans?.[0].id, source.plans?.[0].id)
    const copiedPrices = await p.find({ collection: 'project-prices', where: { project: { equals: copy.id } }, pagination: false })
    assert.equal(copiedPrices.docs.length, 1)
    assert.equal(copiedPrices.docs[0].price, originalPrice.price)
    assert.deepEqual(copiedPrices.docs[0].history, originalPrice.history)
    assert.notEqual(copiedPrices.docs[0].lookupKey, originalPrice.lookupKey)
    await p.update({ collection: 'projects', id: copy.id, data: { _status: 'published' } })
    const published = await p.find({ collection: 'projects', where: { and: [{ id: { in: [source.id, copy.id] } }, { _status: { equals: 'published' } }] }, draft: false })
    assert.equal(published.docs.length, 2)
    process.env.CMS_SITE_API_KEY = 'local-project-copy-test-key-at-least-32-chars'
    const publicReq = await createLocalReq({ req: { url: 'https://cms.example.test/api/projects/catalog', headers: new Headers({ authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }) } }, p)
    const catalogue = await (await projectCatalogEndpoint.handler(publicReq)).json()
    const originalCard = catalogue.items.find((item: { slug: string }) => item.slug === source.slug)
    const copiedCard = catalogue.items.find((item: { slug: string }) => item.slug === copy.slug)
    const content = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key]) => !['id', 'cmsId', 'slug', 'href'].includes(key)))
    assert.ok(originalCard); assert.ok(copiedCard)
    assert.deepEqual(content(copiedCard), content(originalCard), 'the public catalogue contains two identical cards with independent URLs and IDs')
    await p.update({ collection: 'project-prices', id: copiedPrices.docs[0].id, data: { price: 6000000 } })
    assert.equal((await p.findByID({ collection: 'project-prices', id: originalPrice.id })).price, 5700000)
    const before = (await p.count({ collection: 'projects' })).totalDocs
    const create = p.create.bind(p)
    p.create = (async (args: Parameters<typeof p.create>[0]) => { if (args.collection === 'project-prices') throw new Error('Injected price failure'); return create(args) }) as typeof p.create
    try { await assert.rejects(copyProject(await request(), source.id), /Injected price failure/) } finally { p.create = create }
    assert.equal((await p.count({ collection: 'projects' })).totalDocs, before, 'failed price copy rolls back the project and its version')
    const viewer = await p.create({ collection: 'users', data: { email: `viewer-${suffix}@example.test`, password: randomUUID(), firstName: 'Тест', lastName: 'Чтение', role: 'viewer' }, req: adminReq })
    users.push(viewer.id)
    const viewerReq = await createLocalReq({ user: { ...viewer, collection: 'users' }, req: { routeParams: { id: source.id }, headers: new Headers({ origin: 'https://cms.example.test' }), url: 'https://cms.example.test/api/projects/1/copy' } }, p)
    assert.equal((await projectCopyEndpoint.handler(viewerReq)).status, 403)
    const foreignOrigin = await request()
    foreignOrigin.headers = new Headers({ origin: 'https://other.example.test' })
    assert.equal((await projectCopyEndpoint.handler(foreignOrigin)).status, 403)
    const ready = await p.create({ collection: 'projects', data: { name: 'Готовый дом', slug: `ready-test-${suffix}`, recordType: 'ready-home', technologyBadge: 'Модульный', areaValue: 46, floorsValue: 1, bedrooms: 1, bathrooms: 1, readyHome: { location: 'Нижний Новгород', salePrice: 3000000, configurationLead: 'Дом под ключ', configuration: [{ text: 'Кухня' }], sections: [{ title: 'Участок', tone: 'place', points: [{ title: 'Расположение', items: [{ text: 'Рядом с лесом' }] }] }] } } })
    projects.push(ready.id)
    const readyCopy = await copyProject(await request(), ready.id)
    projects.push(readyCopy.doc.id)
    const readyDoc = await p.findByID({ collection: 'projects', id: readyCopy.doc.id, depth: 0, draft: true })
    assert.equal(readyDoc.recordType, 'ready-home')
    assert.deepEqual(projectCopyData(fields, readyDoc as unknown as Record<string, unknown>, 'normalized'), projectCopyData(fields, ready as unknown as Record<string, unknown>, 'normalized'))
  } finally {
    for (const id of projects.reverse()) await p.delete({ collection: 'projects', id })
    for (const id of users.filter(id => id !== admin.id)) await p.delete({ collection: 'users', id, req: adminReq })
    await p.destroy()
  }
})
