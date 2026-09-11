export type ProjectQuery = {
  siteCode: string
  ids?: string[]
  limit?: number
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
