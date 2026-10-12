import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createLocalReq, getPayload } from 'payload'

if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
let testId: number | undefined
try {
  const admin = (await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'super-admin' } }, { isBlocked: { equals: false } }] }, limit: 1 })).docs[0]
  assert.ok(admin)
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload)
  const form = (await payload.find({ collection: 'forms', limit: 1, req, overrideAccess: false })).docs[0]
  const block = (await payload.find({ collection: 'blocks', limit: 1, req, overrideAccess: false })).docs[0]
  assert.ok(form && block)
  const route = `/__cms-verify-${Date.now()}`
  const created = await payload.create({ collection: 'pages', req, overrideAccess: false, data: { kind: 'page', title: 'Проверка структуры', route, metaTitle: 'Проверка', layout: [{ component: { relationTo: 'blocks', value: block.id } }, { component: { relationTo: 'forms', value: form.id } }] } })
  testId = created.id
  await payload.update({ collection: 'pages', id: testId, req, overrideAccess: false, data: { route: `${route}-edited`, metaTitle: 'Изменённый title', layout: [...created.layout!].reverse() } })
  const saved = await payload.findByID({ collection: 'pages', id: testId, req, overrideAccess: false, depth: 0 })
  assert.equal(saved.metaTitle, 'Изменённый title')
  assert.equal(saved.route, `${route}-edited`)
  assert.equal(saved.layout?.[0].component.relationTo, 'forms')
  assert.equal(saved.layout?.[1].component.relationTo, 'blocks')
  await assert.rejects(payload.update({ collection: 'pages', id: testId, req, overrideAccess: false, data: { route: 'invalid route' } }))
  const anonymous = await createLocalReq({}, payload)
  await assert.rejects(payload.find({ collection: 'pages', req: anonymous, overrideAccess: false }))
  console.log('Сохранение title, маршрута и порядка блоков/форм, валидация и запрет анонимного доступа: OK')
} finally {
  if (testId) await payload.delete({ collection: 'pages', id: testId, overrideAccess: true })
  await payload.destroy()
}
process.exit(0)
