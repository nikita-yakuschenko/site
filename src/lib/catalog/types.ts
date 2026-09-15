export const CATALOG_SERIES = ['panel', 'barn', 'classic', 'modular'] as const

export type CatalogSeries = (typeof CATALOG_SERIES)[number]

export function isCatalogSeries(value: string): value is CatalogSeries {
  return (CATALOG_SERIES as readonly string[]).includes(value)
}

export type ProjectQuery = {
  siteCode: string
  ids?: string[]
  limit?: number
  series?: CatalogSeries
  floors?: number
  minArea?: number
  maxArea?: number
}

export type CatalogOption = {
  id: string
  name: string
  price: number
  defaultSelected: boolean
}

export type CatalogProject = {
  id: string
  slug: string
  name: string
  area: string
  areaValue: number
  floors: string
  floorsValue: number
  bedrooms: string
  bathrooms: string
  priceLabel: string
  priceAmount: number | null
  imageUrl: string
  technologyBadge: string
  series: CatalogSeries
  href: string
  description: string
  exteriors: string[]
  interiors: string[]
  floorPlans: string[]
  options: CatalogOption[]
}

export type ProjectListResult = {
  items: CatalogProject[]
}

export type SiteCatalogContext = {
  siteCode: string
}

export interface ProjectCatalogProvider {
  list(query: ProjectQuery): Promise<ProjectListResult>
  getBySlug(slug: string, context: SiteCatalogContext): Promise<CatalogProject | null>
}

export { formatFromRub, formatRub } from '../locale'
