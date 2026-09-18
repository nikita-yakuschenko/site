import { CATALOG_PROJECTS } from './projects'
import { resolveProjectPrice } from '../mortgage/projects'
import {
  CATALOG_SERIES,
  type CatalogFilters,
  type CatalogProject,
  type ProjectCatalogProvider,
  type ProjectQuery,
  type Range,
  type SiteCatalogContext,
} from './types'

/**
 * Каталог из фикстур.
 *
 * Источник это папки public/catalog, собранные в projects.ts. На главной без
 * отбора отдаём по одному проекту из каждой серии по кругу, чтобы лента
 * «Популярные» не состояла из одних барнхаусов. Полный список без limit
 * нужен странице каталога.
 */
export class FixtureCatalogProvider implements ProjectCatalogProvider {
  constructor(private readonly source = CATALOG_PROJECTS) {}

  async list(query: ProjectQuery): Promise<{ items: CatalogProject[]; rest: CatalogProject[] }> {
    let pool = this.source
    if (query.ids?.length) {
      const allow = new Set(query.ids)
      pool = pool.filter((item) => allow.has(item.id))
    }

    const filters = query.filters
    /* Выдача не режется, а делится надвое: подходящие и все остальные.
       Пустого экрана быть не должно, даже если под условия не подошло
       ничего. Хвост упорядочен по числу несошедшихся условий. */
    const scored = pool.map((item) => ({ item, misses: countMisses(item, filters) }))
    const items = scored.filter((row) => row.misses === 0).map((row) => row.item)
    const rest = scored
      .filter((row) => row.misses > 0)
      .sort((a, b) => a.misses - b.misses || a.item.areaValue - b.item.areaValue)
      .map((row) => row.item)

    if (query.limit != null) {
      const trimmed = filters ? items.slice(0, query.limit) : interleave(items, query.limit)
      return { items: trimmed, rest }
    }
    return { items, rest }
  }

  async getBySlug(slug: string, _context: SiteCatalogContext): Promise<CatalogProject | null> {
    return this.source.find((item) => item.slug === slug) ?? null
  }
}

/**
 * Совпадение по названию. Ищем по кускам, а не целой строкой: «шведский 130»
 * и «130 шведский» это один и тот же запрос, человек помнит название
 * приблизительно. Регистр не в счёт, ё и е считаем одной буквой.
 */
function matchesName(name: string, query: string): boolean {
  const fold = (value: string) => value.toLowerCase().replace(/ё/g, 'е')
  const haystack = fold(name)
  return fold(query)
    .split(' ')
    .every((part) => haystack.includes(part))
}

function inRange(value: number, range: Range | undefined): boolean {
  if (!range) return true
  if (range.min != null && value < range.min) return false
  if (range.max != null && value > range.max) return false
  return true
}

/** Сколько заданных условий проект не выполнил. 0 значит подходит полностью. */
function countMisses(item: CatalogProject, filters: CatalogFilters | undefined): number {
  if (!filters) return 0
  let misses = 0
  if (filters.q && !matchesName(item.name, filters.q)) misses += 1
  if (filters.series && item.series !== filters.series) misses += 1
  if (filters.tech?.length && !filters.tech.includes(item.technology)) misses += 1
  if (!inRange(item.areaValue, filters.area)) misses += 1
  if (filters.price) {
    const price = resolveProjectPrice(item)
    if (price == null || !inRange(price, filters.price)) misses += 1
  }
  if (filters.bedrooms?.length && !filters.bedrooms.includes(Number(item.bedrooms))) misses += 1
  if (filters.bathrooms?.length && !filters.bathrooms.includes(Number(item.bathrooms))) misses += 1
  if (filters.floors?.length && !filters.floors.includes(item.floorsValue)) misses += 1
  return misses
}

function interleave(items: CatalogProject[], limit: number): CatalogProject[] {
  const buckets = CATALOG_SERIES.map((series) => items.filter((item) => item.series === series))
  const mixed: CatalogProject[] = []
  let index = 0
  while (mixed.length < limit) {
    let added = false
    for (const bucket of buckets) {
      const next = bucket[index]
      if (!next) continue
      mixed.push(next)
      added = true
      if (mixed.length >= limit) break
    }
    if (!added) break
    index += 1
  }
  return mixed
}
