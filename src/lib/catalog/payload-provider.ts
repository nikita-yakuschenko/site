import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import type { Catalog } from '../../payload-types'
import { copy } from '../copy'
import { mediaUrl } from '../media'
import { FixtureCatalogProvider, getFixtureBySlug } from './fixture-provider'
import {
  formatFromRub,
  type CatalogProject,
  type ProjectCatalogProvider,
  type ProjectQuery,
  type SiteCatalogContext,
} from './types'

const TECH_LABEL: Record<Catalog['technology'], string> = {
  modular: 'Модульная',
  'panel-frame': 'Панельно-каркасная',
}

function mapDoc(doc: Catalog): CatalogProject {
  const cover = mediaUrl(doc.cover)
  const exteriors = (doc.exteriors || []).map((row) => mediaUrl(row.image)).filter(Boolean)
  const interiors = (doc.interiors || []).map((row) => mediaUrl(row.image)).filter(Boolean)
  const floorPlans = (doc.floorPlans || []).map((row) => mediaUrl(row.image)).filter(Boolean)
  const imageUrl = cover || exteriors[0] || ''
  const fixture = getFixtureBySlug(doc.slug)

  const options = (doc.options || []).map((opt, index) => ({
    id: opt.id || `opt-${index}`,
    name: opt.name,
    price: opt.price ?? 0,
    defaultSelected: Boolean(opt.defaultSelected),
  }))

  return {
    id: String(doc.id),
    slug: doc.slug,
    name: doc.name,
    area: String(doc.area),
    areaValue: doc.area,
    floors: String(doc.floors),
    floorsValue: doc.floors,
    bedrooms: String(doc.bedrooms),
    bathrooms: String(doc.bathrooms),
    priceAmount: doc.priceAmount ?? null,
    priceLabel: doc.priceAmount == null ? copy.priceOnRequest : formatFromRub(doc.priceAmount),
    imageUrl: imageUrl || fixture?.imageUrl || '',
    technologyBadge: TECH_LABEL[doc.technology] || doc.technology,
    href: `/projects/${doc.slug}`,
    description: doc.description || fixture?.description || '',
    exteriors: exteriors.length ? exteriors : fixture?.exteriors || (imageUrl ? [imageUrl] : []),
    interiors: interiors.length ? interiors : fixture?.interiors || [],
    floorPlans: floorPlans.length ? floorPlans : fixture?.floorPlans || [],
    options: options.length ? options : fixture?.options || [],
  }
}

function buildWhere(query: ProjectQuery): Where | undefined {
  const clauses: Where[] = []

  if (query.ids?.length) {
    const numericIds = query.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    if (!numericIds.length) return { id: { in: [] } }
    clauses.push({ id: { in: numericIds } })
  }
  if (query.floors) clauses.push({ floors: { equals: query.floors } })
  if (query.minArea != null) clauses.push({ area: { greater_than_equal: query.minArea } })
  if (query.maxArea != null) clauses.push({ area: { less_than_equal: query.maxArea } })

  if (!clauses.length) return undefined
  if (clauses.length === 1) return clauses[0]
  return { and: clauses }
}

export class PayloadCatalogProvider implements ProjectCatalogProvider {
  constructor(private readonly fallback: ProjectCatalogProvider = new FixtureCatalogProvider()) {}

  async list(query: ProjectQuery): Promise<{ items: CatalogProject[] }> {
    try {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'catalog',
        where: buildWhere(query),
        limit: query.limit ?? 12,
        depth: 1,
        sort: 'name',
      })

      // Пустой каталог без явного выбора — показываем фикстуры, чтобы сайт не был пустым.
      if (!result.docs.length && !query.ids?.length) {
        return this.fallback.list(query)
      }

      return { items: result.docs.map(mapDoc) }
    } catch {
      return this.fallback.list(query)
    }
  }

  async getBySlug(slug: string, context: SiteCatalogContext): Promise<CatalogProject | null> {
    try {
      const payload = await getPayload({ config })
      const result = await payload.find({
        collection: 'catalog',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
      })
      if (result.docs[0]) return mapDoc(result.docs[0] as Catalog)
      return this.fallback.getBySlug(slug, context)
    } catch {
      return this.fallback.getBySlug(slug, context)
    }
  }
}

export function createCatalogProvider(): ProjectCatalogProvider {
  return new PayloadCatalogProvider()
}
