import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import type { Project, ProjectPrice } from '../src/payload-types'
import type { PayloadRequest } from 'payload'
import { catalogYml } from '../src/config/catalog-yml'
import { projectYmlEndpoint } from '../src/collections/project-yml-endpoint'
const p = (overrides = {}) => ({ id: 1, name: 'Дом & <лес> "уют"', slug: 'house-1', _status: 'published', technologyBadge: 'Модульный', areaValue: 42, bedrooms: 0, bathrooms: 1, floorsValue: 1, imageUrl: '/house.jpg?a=1&b=2', priceAmount: 3000000, ...overrides }) as Project
const price = { project: 1, configuration: 'standard', region: 'nn', price: 4500000 } as ProjectPrice

test('125 offers parse as XML, IDs unique, prices positive, categories and links valid', () => {
  const result = catalogYml(Array.from({ length: 125 }, (_, i) => p({ id: i + 1, slug: `house-${i + 1}`, technologyBadge: i % 2 ? 'Панельно-каркасный' : 'Модульный' })), [price], new Date('2026-10-20T10:05:00Z'))
  assert.equal(result.count, 125)
  assert.match(result.xml, /date="2026-10-20 13:05"/)
  assert.match(result.xml, /<price>4500000</)
  execFileSync('python', ['-c', `import sys,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); assert r.tag=='yml_catalog'; o=r.findall('./shop/offers/offer'); assert len(o)==125; assert len({x.attrib['id'] for x in o})==125; assert all(float(x.findtext('price'))>0 and x.findtext('categoryId') in ('1','2') and x.findtext('url').startswith('https://avgst.ru/catalog/') for x in o); assert o[0].findtext('name')=='Дом & <лес> "уют"'`], { input: result.xml, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
})
test('drafts excluded, invalid offers counted, optional values omitted, duplicates rejected', () => {
  const result = catalogYml([p(), p({ id: 2, _status: 'draft' }), p({ id: 3, priceAmount: 0 }), p({ id: 4, imageUrl: null }), p({ id: 5, bedrooms: null, bathrooms: null, areaValue: null })], [])
  assert.equal(result.count, 2)
  assert.equal(result.skipped, 2)
  assert.match(result.xml, /name="Количество спален">0</)
  assert.doesNotMatch(result.xml, /undefined|null|Размеры/)
  assert.throws(() => catalogYml([p(), p()], []), /идентификатор/)
})
test('standard price precedence and ready-home sale price match public catalogue', () => {
  assert.match(catalogYml([p({ configurations: [{ key: 'start', price: 1 }, { key: 'standard', price: 200 }] })], []).xml, /<price>200</)
  assert.match(catalogYml([p({ recordType: 'ready-home', readyHome: { salePrice: 123 } })], [price]).xml, /<price>123</)
})
function request(user: unknown, blocked = false) {
  const calls: Record<string, unknown>[] = []
  const req = { user, payload: {
    findByID: async () => ({ role: 'viewer', isBlocked: blocked }),
    find: async (args: Record<string, unknown>) => { calls.push(args); return { docs: args.collection === 'projects' ? [p()] : [price] } },
    logger: { error: () => {} },
  } } as unknown as PayloadRequest
  return { req, calls }
}
test('anonymous and blocked staff denied before catalogue read', async () => {
  for (const [user, blocked] of [[null, false], [{ id: 1, collection: 'users' }, true]] as const) {
    const { req, calls } = request(user, blocked)
    assert.equal((await projectYmlEndpoint.handler(req)).status, 403)
    assert.equal(calls.length, 0)
  }
})
test('authorized endpoint requests live published documents, all pages, enforced access', async () => {
  const { req, calls } = request({ id: 1, collection: 'users' })
  const response = await projectYmlEndpoint.handler(req)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="avgst-catalog.yml"')
  assert.equal(response.headers.get('X-Export-Count'), '1')
  assert.equal(calls[0].draft, false)
  assert.deepEqual(calls[0].where, { _status: { equals: 'published' } })
  assert.ok(calls.every(call => call.pagination === false && call.overrideAccess === false))
})

test('live published values are used when a newer draft exists', async () => {
  const { req } = request({ id: 1, collection: 'users' })
  req.payload.find = (async (args: { collection: string; draft?: boolean }) => ({ docs: args.collection === 'projects' ? [p({ name: args.draft === false ? 'Опубликованное название' : 'Черновая правка' })] : [] })) as typeof req.payload.find
  const response = await projectYmlEndpoint.handler(req)
  const body = await response.text()
  assert.match(body, /Опубликованное название/)
  assert.doesNotMatch(body, /Черновая правка/)
})

test('empty feed and database errors return understandable errors', async () => {
  const { req } = request({ id: 1, collection: 'users' })
  req.payload.find = (async () => ({ docs: [] })) as unknown as typeof req.payload.find
  assert.equal((await projectYmlEndpoint.handler(req)).status, 422)
  req.payload.find = async () => { throw new Error('private database details') }
  const response = await projectYmlEndpoint.handler(req)
  assert.equal(response.status, 500)
  assert.doesNotMatch(await response.text(), /private database details/)
})


test('collections follow offers and link only exported published projects', () => {
  const result = catalogYml([p(), p({ id: 2, technologyBadge: 'Панельно-каркасный' })], [])
  execFileSync('python', ['-c', `import sys,xml.etree.ElementTree as E; s=E.fromstring(sys.stdin.read()).find('shop'); c=s.find('collections'); assert list(s).index(c)>list(s).index(s.find('offers')); ids={x.attrib['id'] for x in c}; assert ids=={'all-houses','modular-houses','frame-houses'}; assert all(x.findtext('name') and x.findtext('description') and x.findtext('picture') and x.findtext('url').startswith('https://avgst.ru/catalog') for x in c); o=s.findall('./offers/offer'); assert [x.text for x in o[0].findall('collectionId')]==['all-houses','modular-houses']; assert [x.text for x in o[1].findall('collectionId')]==['all-houses','frame-houses']; assert all(x.text in ids for v in o for x in v.findall('collectionId')); assert c[1].findtext('url')=='https://avgst.ru/catalog?tech=modular'; assert c[2].findtext('url')=='https://avgst.ru/catalog?tech=panel'; assert c[0].findtext('picture').endswith('?a=1&b=2')`], { input: result.xml, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  const onlyModular = catalogYml([p(), p({ id: 2, technologyBadge: 'Панельно-каркасный', _status: 'draft' }), p({ id: 3, technologyBadge: 'Панельно-каркасный', priceAmount: 0 })], [])
  assert.doesNotMatch(onlyModular.xml, /frame-houses/)
  assert.doesNotMatch(catalogYml([], []).xml, /<collection id=/)
})
