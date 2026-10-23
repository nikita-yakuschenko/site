import assert from 'node:assert/strict'
import test from 'node:test'
import { compareCatalogRows, sortingFrom } from '../src/components/admin/catalog-sorting'

const rows = [
  { id: 1, name: 'Дом 113', viewCount: 2, likeCount: 10, shareCount: 0 },
  { id: 2, name: 'Дом 46', viewCount: 10, likeCount: 2, shareCount: 3 },
  { id: 3, name: 'Дом 70', viewCount: null, likeCount: null, shareCount: null },
]
const leads = { 1: 12, 2: 3 }

test('all four statistics sort numerically in both directions before pagination', () => {
  const expected = { views: [3, 1, 2], likes: [3, 2, 1], shares: [3, 1, 2], leads: [3, 2, 1] }
  for (const key of ['views', 'likes', 'shares', 'leads'] as const) {
    const asc = [...rows].sort((a, b) => compareCatalogRows(a, b, { key, direction: 'asc' }, leads))
    assert.deepEqual(asc.map(row => row.id), expected[key])
    const desc = [...rows].sort((a, b) => compareCatalogRows(a, b, { key, direction: 'desc' }, leads))
    assert.equal(desc[0].id, expected[key][2])
    assert.deepEqual(desc.slice(0, 1).map(row => row.id), [expected[key][2]])
  }
})

test('ties and default ordering use natural project names', () => {
  const tied = rows.map(row => ({ ...row, viewCount: 0 }))
  for (const direction of ['asc', 'desc'] as const) assert.deepEqual([...tied].sort((a, b) => compareCatalogRows(a, b, { key: 'views', direction }, leads)).map(row => row.name), ['Дом 46', 'Дом 70', 'Дом 113'])
  assert.deepEqual([...rows].sort((a, b) => compareCatalogRows(a, b, null, leads)).map(row => row.name), ['Дом 46', 'Дом 70', 'Дом 113'])
})

test('URL state restores only supported statistics and direction', () => {
  assert.deepEqual(sortingFrom(new URLSearchParams('sort=leads&direction=desc')), { key: 'leads', direction: 'desc' })
  assert.deepEqual(sortingFrom(new URLSearchParams('sort=views&direction=bad')), { key: 'views', direction: 'asc' })
  assert.equal(sortingFrom(new URLSearchParams('sort=bad')), null)
})
