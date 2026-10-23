import type { Project } from '../../payload-types'

const keys = ['views', 'likes', 'shares', 'leads'] as const
export type CatalogSort = { key: typeof keys[number]; direction: 'asc' | 'desc' }
const names = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function sortingFrom(params: { get(name: string): string | null }): CatalogSort | null {
  const key = params.get('sort')
  return keys.includes(key as CatalogSort['key']) ? { key: key as CatalogSort['key'], direction: params.get('direction') === 'desc' ? 'desc' : 'asc' } : null
}

export function stat(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

type Row = Pick<Project, 'id' | 'name' | 'viewCount' | 'likeCount' | 'shareCount'>
export function compareCatalogRows(left: Row, right: Row, sorting: CatalogSort | null, leads: Record<string, number>) {
  if (sorting) {
    const value = (row: Row) => stat(sorting.key === 'leads' ? leads[row.id] : row[sorting.key === 'views' ? 'viewCount' : sorting.key === 'likes' ? 'likeCount' : 'shareCount'])
    const difference = value(left) - value(right)
    if (difference) return sorting.direction === 'asc' ? difference : -difference
  }
  return names.compare(left.name || '', right.name || '')
}
