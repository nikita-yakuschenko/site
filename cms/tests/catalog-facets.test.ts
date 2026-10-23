import assert from 'node:assert/strict'
import test from 'node:test'
import { facetsOf } from '../../src/lib/catalog/filters'
import type { CatalogTechnology } from '../../src/lib/catalog/types'

test('empty catalog has finite bounds', () => {
  assert.deepEqual(facetsOf([]), { technologies: [], area: { min: 0, max: 0 }, price: { min: 0, max: 0 }, bedrooms: [], bathrooms: [], floors: [] })
})

test('a project without an imported price keeps its area and has no price range', () => {
  const facets = facetsOf([{ areaValue: 113, priceAmount: null, bedrooms: '3', bathrooms: '2', floorsValue: 1, technology: 'modular' }])
  assert.deepEqual(facets.area, { min: 113, max: 113 })
  assert.deepEqual(facets.price, { min: 0, max: 0 })
})

test('price bounds use only valid published prices', () => {
  const project = { areaValue: 113, bedrooms: '3', bathrooms: '2', floorsValue: 1, technology: 'panel' as const }
  const facets = facetsOf([null, 0, Infinity, NaN, 4_000_000, 6_000_000].map(priceAmount => ({ ...project, priceAmount })))
  assert.deepEqual(facets.price, { min: 4_000_000, max: 6_000_000 })
})

test('technology options follow the published catalog: missing, added and removed projects', () => {
  const project = { areaValue: 80, priceAmount: null, bedrooms: '2', bathrooms: '1', floorsValue: 1 }
  const catalog = (technologies: CatalogTechnology[]) => technologies.map(technology => ({ ...project, technology }))
  assert.deepEqual(facetsOf(catalog(['panel', 'modular', 'panel'])).technologies, ['modular', 'panel'])
  assert.deepEqual(facetsOf(catalog(['frame', 'panel', 'modular'])).technologies, ['modular', 'panel', 'frame'])
  assert.deepEqual(facetsOf(catalog(['frame'])).technologies, ['frame'])
  assert.deepEqual(facetsOf(catalog([])).technologies, [])
})
