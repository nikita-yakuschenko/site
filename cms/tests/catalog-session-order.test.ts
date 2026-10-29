import assert from 'node:assert/strict'
import test from 'node:test'
import { catalogOrder, sortCatalog } from '../../src/lib/catalog/order'
import { catalogSessionSeed } from '../../src/lib/catalog/session'

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const items = Array.from({ length: 30 }, (_, index) => ({ id: `project-${index}`, hero_product: index < 2 ? index + 1 : null, areaValue: index + 50, priceAmount: index + 100 }))

test('session order survives input changes, filtering and added projects; pins remain first', () => {
  const before = structuredClone(items)
  const ids = (list: typeof items) => list.map(item => item.id)
  const ordered = catalogOrder(items, first)
  assert.deepEqual(ids(ordered.slice(0, 2)), ['project-0', 'project-1'])
  assert.deepEqual(ids(catalogOrder([...items].reverse(), first)), ids(ordered))
  const filtered = items.filter((_, index) => index % 2 === 0)
  assert.deepEqual(ids(catalogOrder(filtered, first)), ids(ordered.filter(item => filtered.some(row => row.id === item.id))))
  const expanded = catalogOrder([...items, { id: 'new', hero_product: null, areaValue: 1, priceAmount: 1 }], first)
  assert.deepEqual(ids(expanded.filter(item => item.id !== 'new')), ids(ordered))
  assert.notDeepEqual(ids(catalogOrder(items, second).slice(2)), ids(ordered.slice(2)))
  assert.deepEqual(ids(sortCatalog(ordered, 'area-desc', 'nn')), ids([...items].reverse()))
  assert.deepEqual(items, before)
})

test('valid session tokens are reused; missing or malformed cookies receive a new seed', () => {
  assert.equal(catalogSessionSeed(first, () => { throw Error('must not regenerate') }), first)
  for (const value of [undefined, '', 'old', 'x'.repeat(500), `${first}\r\nheader`]) assert.equal(catalogSessionSeed(value, () => second), second)
})
