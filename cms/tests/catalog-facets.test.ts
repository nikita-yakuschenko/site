import assert from 'node:assert/strict'
import test from 'node:test'
import { facetsOf } from '../../src/lib/catalog/filters'

test('empty catalog has finite bounds', () => {
  assert.deepEqual(facetsOf([]), { area: { min: 0, max: 0 }, price: { min: 0, max: 0 }, bedrooms: [], bathrooms: [], floors: [] })
})

test('a project without an imported price keeps its area and has no price range', () => {
  const facets = facetsOf([{ areaValue: 113, priceAmount: null, bedrooms: '3', bathrooms: '2', floorsValue: 1 }])
  assert.deepEqual(facets.area, { min: 113, max: 113 })
  assert.deepEqual(facets.price, { min: 0, max: 0 })
})

test('price bounds use only valid published prices', () => {
  const project = { areaValue: 113, bedrooms: '3', bathrooms: '2', floorsValue: 1 }
  const facets = facetsOf([null, 0, Infinity, NaN, 4_000_000, 6_000_000].map(priceAmount => ({ ...project, priceAmount })))
  assert.deepEqual(facets.price, { min: 4_000_000, max: 6_000_000 })
})
