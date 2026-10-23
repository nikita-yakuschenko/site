import test from 'node:test'
import assert from 'node:assert/strict'
import type { PayloadRequest } from 'payload'
import type { Project } from '../src/payload-types'
import { catalogOrder, sortCatalog } from '../../src/lib/catalog/order'
import { parseFilters, filtersToHref, isEmpty, canonicalRedirect } from '../../src/lib/catalog/filters'
import { FixtureCatalogProvider } from '../../src/lib/catalog/fixture-provider'
import { projectCatalogEndpoint } from '../src/collections/project-catalog-endpoint'
import type { CatalogProject } from '../../src/lib/catalog/types'

test('четыре сортировки включают локомотивы в общий порядок, учитывают регион, неизвестные цены всегда в конце', () => {
  const items = [
    { id: 'first', hero_product: 1, areaValue: 300, priceAmount: 9 },
    { id: 'second', hero_product: 2, areaValue: 400, priceAmount: 10 },
    { id: 'a', areaValue: 80, priceAmount: 3, regionalPrices: { nn: 3, msk: 6 } },
    { id: 'b', areaValue: 120, priceAmount: 5, regionalPrices: { nn: 5, msk: 4 } },
    { id: 'unknown', areaValue: 60, priceAmount: null },
  ]
  const ids = (sort: CatalogProjectSort, region: 'nn' | 'msk' = 'nn') => sortCatalog(items, sort, region).map(item => item.id)
  type CatalogProjectSort = Parameters<typeof sortCatalog>[1]
  assert.deepEqual(ids('price-asc'), ['a', 'b', 'first', 'second', 'unknown'])
  assert.deepEqual(ids('price-desc'), ['second', 'first', 'b', 'a', 'unknown'])
  assert.deepEqual(ids('price-asc', 'msk'), ['b', 'a', 'first', 'second', 'unknown'])
  assert.deepEqual(ids('area-asc'), ['unknown', 'a', 'b', 'first', 'second'])
  assert.deepEqual(ids('area-desc'), ['second', 'first', 'b', 'a', 'unknown'])
  assert.deepEqual(sortCatalog(items, undefined, 'nn'), items)
})

test('сортировка сохраняется в ссылке вместе с фильтрами и не считается условием отбора', () => {
  const filters = parseFilters({ area: '80-140', sort: 'price-desc' })
  assert.equal(filtersToHref(filters), '/catalog?area=80-140&sort=price-desc')
  assert.equal(canonicalRedirect({ area: '80-140', sort: 'price-desc' }, filters), null)
  assert.equal(isEmpty(parseFilters({ sort: 'area-asc' })), true)
  assert.equal(filtersToHref(parseFilters({ sort: 'invalid' })), '/catalog')
})

test('два закреплённых места сохраняются при любом перемешивании; входной массив не меняется', () => {
  const items = [{ id: 'a' }, { id: 'second', hero_product: 2 }, { id: 'b' }, { id: 'first', hero_product: 1 }, { id: 'c' }]
  const original = structuredClone(items)
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const result = catalogOrder(items, random)
    assert.deepEqual(result.slice(0, 2).map(item => item.id), ['first', 'second'])
    assert.deepEqual(result.slice(2).map(item => item.id).sort(), ['a', 'b', 'c'])
    assert.equal(new Set(result.map(item => item.id)).size, items.length)
  }
  assert.deepEqual(items, original)
  assert.notDeepEqual(catalogOrder(items, () => 0).slice(2), catalogOrder(items, () => 0.999).slice(2))
})

test('одно закрепление и снятие закрепления не создают пропуски или дополнительные карточки', () => {
  assert.deepEqual(catalogOrder([{ id: 'a' }, { id: 'b', hero_product: 2 }]).map(item => item.id), ['b', 'a'])
  assert.deepEqual(catalogOrder([]), [])
  const items = [{ id: 'a', hero_product: null }, { id: 'b', hero_product: 3 }, { id: 'c' }]
  assert.deepEqual(catalogOrder(items, () => 0).map(item => item.id), ['b', 'c', 'a'])
})

test('CMS передаёт позицию проекта; готовый дом не получает закрепление; фильтры сохраняют приоритет совпадений', async () => {
  const key = process.env.CMS_SITE_API_KEY
  const origin = process.env.CMS_PUBLIC_URL
  process.env.CMS_SITE_API_KEY = 'hero-product-test-key-at-least-32-characters'
  process.env.CMS_PUBLIC_URL = 'https://cms.example'
  const records = [
    { id: 1, name: 'Первый', hero_product: 1, recordType: 'project', areaValue: 80 },
    { id: 2, name: 'Второй', hero_product: 2, recordType: 'project', areaValue: 150 },
    { id: 3, name: 'Обычный', hero_product: null, recordType: 'project', areaValue: 90 },
    { id: 4, name: 'Готовый', hero_product: 1, recordType: 'ready-home', areaValue: 70 },
  ].map(row => ({ ...row, slug: `house-${row.id}`, technologyBadge: 'Каркасный', floorsValue: 1, bedrooms: 2, bathrooms: 1, _status: 'published' })) as Project[]
  try {
    const req = { url: 'https://cms.example/api/projects/catalog', headers: new Headers({ authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }),
      payload: { find: async ({ collection }: { collection: string }) => ({ docs: collection === 'projects' ? records : [] }) } } as unknown as PayloadRequest
    const response = await projectCatalogEndpoint.handler(req)
    assert.equal(response.status, 200)
    const { items } = await response.json() as { items: CatalogProject[] }
    assert.deepEqual(items.map(item => item.hero_product), [1, 2, null, null])
    const filtered = await new FixtureCatalogProvider(items).list({ siteCode: 'avgst', filters: { area: { max: 100 } } })
    const ordered = catalogOrder(filtered.items, () => 0)
    assert.equal(ordered[0].name, 'Первый')
    assert.equal(ordered.some(item => item.name === 'Второй'), false)
    assert.equal(filtered.rest.some(item => item.name === 'Второй'), true)
    assert.deepEqual(sortCatalog(ordered, 'area-asc', 'nn').map(item => item.name), ['Готовый', 'Первый', 'Обычный'])
  } finally {
    if (key === undefined) delete process.env.CMS_SITE_API_KEY; else process.env.CMS_SITE_API_KEY = key
    if (origin === undefined) delete process.env.CMS_PUBLIC_URL; else process.env.CMS_PUBLIC_URL = origin
  }
})
