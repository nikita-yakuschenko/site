import type { CatalogFilters, CatalogProject } from './types'

export type SortableProject = Pick<CatalogProject, 'id' | 'hero_product' | 'areaValue' | 'priceAmount' | 'regionalPrices'>

/** Явная сортировка действует на все проекты, включая локомотивы; цена соответствует региону карточки. */
export function sortCatalog<T extends SortableProject>(items: readonly T[], sort: CatalogFilters['sort'], region: 'nn' | 'msk'): T[] {
  if (!sort) return [...items]
  const value = (item: T) => sort.startsWith('area') ? item.areaValue : item.regionalPrices ? item.regionalPrices[region] : item.priceAmount
  return [...items].sort((a, b) => {
    const av = value(a), bv = value(b)
    const knownA = av != null && Number.isFinite(av) && av > 0
    const knownB = bv != null && Number.isFinite(bv) && bv > 0
    if (knownA !== knownB) return knownA ? -1 : 1
    return (knownA && knownB ? (av! - bv!) * (sort.endsWith('desc') ? -1 : 1) : 0) || a.id.localeCompare(b.id)
  })
}

function sessionRank(seed: string, id: string) {
  let hash = 2166136261
  for (const char of `${seed}:${id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)
  return (hash ^ (hash >>> 16)) >>> 0
}

/** Pins stay first; a session ranks IDs independently of API order and filtering. */
export function catalogOrder<T extends { id: string; hero_product?: number | null }>(items: readonly T[], seedOrRandom: string | (() => number) = 'default'): T[] {
  const pinned = items.filter(item => item.hero_product === 1 || item.hero_product === 2)
    .sort((a, b) => a.hero_product! - b.hero_product! || a.id.localeCompare(b.id))
  const rest = items.filter(item => item.hero_product !== 1 && item.hero_product !== 2)
  if (typeof seedOrRandom === 'string') {
    rest.sort((a, b) => sessionRank(seedOrRandom, a.id) - sessionRank(seedOrRandom, b.id) || a.id.localeCompare(b.id))
    return [...pinned, ...rest]
  }
  const random = seedOrRandom
  for (let index = rest.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[rest[index], rest[other]] = [rest[other]!, rest[index]!]
  }
  return [...pinned, ...rest]
}
