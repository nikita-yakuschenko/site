import assert from 'node:assert/strict'
import test from 'node:test'
import type { PayloadRequest } from 'payload'
import { projectCatalogEndpoint } from '../src/collections/project-catalog-endpoint'
import { catalogDisplayPrice, catalogDisplayPrices } from '../../src/lib/catalog/display-price'
import { FixtureCatalogProvider } from '../../src/lib/catalog/fixture-provider'
import { sortCatalog } from '../../src/lib/catalog/order'
import { resolveProjectPrice } from '../../src/lib/mortgage/projects'
import type { CatalogProject } from '../../src/lib/catalog/types'

test('catalog API keeps mortgage prices separate from customer specials and never exposes dealers', async () => {
  const previous = process.env.CMS_SITE_API_KEY
  process.env.CMS_SITE_API_KEY = 'catalog-special-test-00000000000000'
  const prices = [['nn', 5000000], ['msk', 6000000], ['special', 4000000], ['special-msk', 4800000], ['dealer', 111111], ['special-dealer', 222222]].map(([region, price]) => ({ project: 1, configuration: 'standard', region, price }))
  try {
    const response = await projectCatalogEndpoint.handler({ url: 'https://cms.example/api/projects/catalog', headers: new Headers({ authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }), payload: { find: async ({ collection }: { collection: string }) => ({ docs: collection === 'projects' ? [{ id: 1, slug: 'house', name: 'House', recordType: 'project', technologyBadge: 'Каркасный', areaValue: 100, floorsValue: 1, bedrooms: 2, bathrooms: 1 }] : prices }) } } as unknown as PayloadRequest)
    assert.equal(response.status, 200)
    const body = await response.json()
    const project = body.items[0] as CatalogProject
    assert.deepEqual(project.regionalPrices, { nn: 5000000, msk: 6000000 })
    assert.deepEqual(project.regionalSpecialPrices, { nn: 4000000, msk: 4800000 })
    assert.equal(resolveProjectPrice(project), 5000000)
    assert.equal(catalogDisplayPrice(project), 4000000)
    assert.equal(catalogDisplayPrice(project, 'msk'), 4800000)
    assert.doesNotMatch(JSON.stringify(body), /dealer|111111|222222/)
  } finally {
    if (previous === undefined) delete process.env.CMS_SITE_API_KEY
    else process.env.CMS_SITE_API_KEY = previous
  }
})

test('filtering and ordering use the displayed regional special; missing specials never borrow ordinary/NN prices', async () => {
  const base = { areaValue: 100, priceAmount: 5000000, regionalPrices: { nn: 5000000, msk: 6000000 } }
  const a = { ...base, id: 'a', regionalSpecialPrices: { nn: 4000000, msk: 4800000 } } as CatalogProject
  const b = { ...base, id: 'b', regionalSpecialPrices: { nn: 4500000, msk: 4200000 } } as CatalogProject
  const missing = { ...base, id: 'missing', regionalSpecialPrices: { nn: 3000000 } } as CatalogProject
  assert.equal(catalogDisplayPrice(missing, 'msk'), null)
  for (const price of [0, -1, NaN, Infinity]) assert.equal(catalogDisplayPrice({ ...base, regionalSpecialPrices: { nn: price } }), null)
  const provider = new FixtureCatalogProvider([a, b, missing])
  assert.deepEqual((await provider.list({ siteCode: 'avgst', region: 'msk', filters: { price: { max: 4300000 } } })).items.map(p => p.id), ['b'])
  const board = [a, b, missing].map(p => ({ ...p, regionalPrices: catalogDisplayPrices(p), priceAmount: catalogDisplayPrice(p) }))
  assert.deepEqual(sortCatalog(board, 'price-asc', 'nn').map(p => p.id), ['missing', 'a', 'b'])
  assert.deepEqual(sortCatalog(board, 'price-asc', 'msk').map(p => p.id), ['b', 'a', 'missing'])
  const ready = { ...a, readyHome: { salePrice: 7000000 } } as CatalogProject
  assert.equal(catalogDisplayPrice(ready, 'msk'), 7000000)
})
