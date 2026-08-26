import { copy } from '../copy'
import { formatFromRub, type CatalogProject, type ProjectCatalogProvider, type ProjectQuery, type SiteCatalogContext } from './types'

const IMG = {
  barn113: '/fixtures/house-1.jpg',
  barn115: '/fixtures/house-2.jpg',
  barn121: '/fixtures/house-3.jpg',
  barn134: '/fixtures/house-4.jpg',
  barn147: '/fixtures/house-5.jpg',
  barn74: '/fixtures/house-6.jpg',
}

const OPTIONS: CatalogProject['options'] = [
  { id: 'base', name: 'Базовая комплектация', price: 0, defaultSelected: true },
  { id: 'terrace', name: 'Терраса', price: 180000, defaultSelected: false },
  { id: 'smart', name: 'Умный дом', price: 95000, defaultSelected: false },
]

function project(
  partial: Omit<CatalogProject, 'href' | 'priceLabel' | 'options'> & { options?: CatalogProject['options'] },
): CatalogProject {
  return {
    ...partial,
    href: `/projects/${partial.slug}`,
    priceLabel: partial.priceAmount == null ? copy.priceOnRequest : formatFromRub(partial.priceAmount),
    options: partial.options ?? OPTIONS,
  }
}

const FIXTURES: CatalogProject[] = [
  project({
    id: 'barn-113',
    slug: 'barn-113',
    name: 'Барнхаус 113',
    area: '116',
    areaValue: 116,
    floors: '1',
    floorsValue: 1,
    bedrooms: '3',
    bathrooms: '2',
    priceAmount: null,
    imageUrl: IMG.barn113,
    technologyBadge: 'Модульная',
    description: 'Одноэтажный модульный барнхаус с террасой и готовой заводской комплектацией.',
    exteriors: [IMG.barn113, IMG.barn115],
    interiors: [IMG.barn121, IMG.barn113],
    floorPlans: [IMG.barn134],
  }),
  project({
    id: 'barn-115',
    slug: 'barn-115',
    name: 'Барнхаус 115',
    area: '115',
    areaValue: 115,
    floors: '1',
    floorsValue: 1,
    bedrooms: '3',
    bathrooms: '1',
    priceAmount: null,
    imageUrl: IMG.barn115,
    technologyBadge: 'Панельно-каркасная',
    description: 'Панельно-каркасный барнхаус с кухней-гостиной и отдельной мастер-спальней.',
    exteriors: [IMG.barn115, IMG.barn113],
    interiors: [IMG.barn147],
    floorPlans: [IMG.barn115, IMG.barn113],
  }),
  project({
    id: 'barn-121',
    slug: 'barn-121',
    name: 'Барнхаус 121',
    area: '122',
    areaValue: 122,
    floors: '1',
    floorsValue: 1,
    bedrooms: '3',
    bathrooms: '1',
    priceAmount: null,
    imageUrl: IMG.barn121,
    technologyBadge: 'Модульная',
    description: 'Модульный дом с панорамным остеклением и готовой заводской отделкой.',
    exteriors: [IMG.barn121, IMG.barn134],
    interiors: [IMG.barn113],
    floorPlans: [IMG.barn121],
  }),
  project({
    id: 'barn-134',
    slug: 'barn-134',
    name: 'Барнхаус 134',
    area: '134',
    areaValue: 134,
    floors: '1',
    floorsValue: 1,
    bedrooms: '3',
    bathrooms: '2',
    priceAmount: null,
    imageUrl: IMG.barn134,
    technologyBadge: 'Модульная',
    description: 'Просторный одноэтажный барнхаус с двумя санузлами и широкой террасой.',
    exteriors: [IMG.barn134, IMG.barn147],
    interiors: [IMG.barn74, IMG.barn115],
    floorPlans: [IMG.barn134],
  }),
  project({
    id: 'barn-147',
    slug: 'barn-147',
    name: 'Барнхаус 147',
    area: '147',
    areaValue: 147,
    floors: '2',
    floorsValue: 2,
    bedrooms: '4',
    bathrooms: '2',
    priceAmount: null,
    imageUrl: IMG.barn147,
    technologyBadge: 'Панельно-каркасная',
    description: 'Двухэтажный панельно-каркасный барнхаус с четырьмя спальнями.',
    exteriors: [IMG.barn147, IMG.barn74],
    interiors: [IMG.barn113],
    floorPlans: [IMG.barn147],
  }),
  project({
    id: 'barn-74',
    slug: 'barn-74',
    name: 'Барнхаус 74',
    area: '76',
    areaValue: 76,
    floors: '1',
    floorsValue: 1,
    bedrooms: '2',
    bathrooms: '1',
    priceAmount: null,
    imageUrl: IMG.barn74,
    technologyBadge: 'Модульная',
    description: 'Компактный модульный дом для постоянного проживания и отдыха.',
    exteriors: [IMG.barn74, IMG.barn113],
    interiors: [IMG.barn115],
    floorPlans: [IMG.barn74],
  }),
]

export function getFixtureBySlug(slug: string): CatalogProject | null {
  return FIXTURES.find((item) => item.slug === slug) ?? null
}

export class FixtureCatalogProvider implements ProjectCatalogProvider {
  constructor(private readonly source = FIXTURES) {}

  async list(query: ProjectQuery): Promise<{ items: CatalogProject[] }> {
    let items = this.source
    if (query.ids?.length) {
      const allow = new Set(query.ids)
      items = items.filter((item) => allow.has(item.id))
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
    return { items: items.slice(0, query.limit ?? 12) }
  }

  async getBySlug(slug: string, _context: SiteCatalogContext): Promise<CatalogProject | null> {
    return this.source.find((item) => item.slug === slug) ?? null
  }
}
