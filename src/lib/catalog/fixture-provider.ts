import { CATALOG_PROJECTS } from './projects'
import { resolveProjectPrice } from '../mortgage/projects'
import {
  CATALOG_SERIES,
  type CatalogProject,
  type ProjectCatalogProvider,
  type ProjectQuery,
  type SiteCatalogContext,
} from './types'

/**
 * Каталог из фикстур.
 *
 * Источник — папки public/catalog, собранные в projects.ts. На главной без
 * серии отдаём по одному проекту из каждой серии по кругу, чтобы лента
 * «Популярные» не состояла из одних барнхаусов. Полный список без limit
 * нужен странице каталога.
 */
export class FixtureCatalogProvider implements ProjectCatalogProvider {
  constructor(private readonly source = CATALOG_PROJECTS) {}

  async list(query: ProjectQuery): Promise<{ items: CatalogProject[] }> {
    let items = this.source
    if (query.ids?.length) {
      const allow = new Set(query.ids)
      items = items.filter((item) => allow.has(item.id))
    }
    if (query.series) {
      items = items.filter((item) => item.series === query.series)
    }
    if (query.floors) {
      items = items.filter((item) => item.floorsValue === query.floors)
    }
    if (query.minArea != null) {
      items = items.filter((item) => item.areaValue >= query.minArea!)
    }
    if (query.maxArea != null) {
      items = items.filter((item) => item.areaValue <= query.maxArea!)
    }
    if (query.maxPrice != null) {
      items = items.filter((item) => {
        const price = resolveProjectPrice(item)
        return price != null && price <= query.maxPrice!
      })
    }
    if (query.limit != null) {
      items = query.series ? items.slice(0, query.limit) : interleave(items, query.limit)
    }
    return { items }
  }

  async getBySlug(slug: string, _context: SiteCatalogContext): Promise<CatalogProject | null> {
    return this.source.find((item) => item.slug === slug) ?? null
  }
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
