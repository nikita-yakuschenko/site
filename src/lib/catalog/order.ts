import type { CatalogFilters, CatalogProject } from './types'

export type SortableProject = Pick<CatalogProject, 'id' | 'hero_product' | 'areaValue' | 'priceAmount' | 'regionalPrices'>

/** Не меняет исходный массив; цена соответствует выбранному региону на карточке. */
export function sortCatalog<T extends SortableProject>(items: readonly T[], sort: CatalogFilters['sort'], region: 'nn' | 'msk'): T[] {
  if (!sort) return [...items]
  const value = (item: T) => sort.startsWith('area') ? item.areaValue : item.regionalPrices ? item.regionalPrices[region] : item.priceAmount
  return [...items].sort((a, b) => {
    const pinA = a.hero_product === 1 || a.hero_product === 2 ? a.hero_product : 3
    const pinB = b.hero_product === 1 || b.hero_product === 2 ? b.hero_product : 3
    if (pinA !== pinB) return pinA - pinB
    const av = value(a), bv = value(b)
    const knownA = av != null && Number.isFinite(av) && av > 0
    const knownB = bv != null && Number.isFinite(bv) && bv > 0
    if (knownA !== knownB) return knownA ? -1 : 1
    return (knownA && knownB ? (av! - bv!) * (sort.endsWith('desc') ? -1 : 1) : 0) || a.id.localeCompare(b.id)
  })
}

/** Закреплённые проекты занимают первые два места, перемешивается только остальная выдача. */
export function catalogOrder<T extends { hero_product?: number | null }>(items: readonly T[], random = Math.random): T[] {
  const pinned = items.filter(item => item.hero_product === 1 || item.hero_product === 2)
    .sort((a, b) => a.hero_product! - b.hero_product!)
  const rest = items.filter(item => item.hero_product !== 1 && item.hero_product !== 2)
  for (let index = rest.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[rest[index], rest[other]] = [rest[other]!, rest[index]!]
  }
  return [...pinned, ...rest]
}
