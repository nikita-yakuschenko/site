import { formatRub, type CatalogProject, type ProjectCatalogProvider, type ProjectQuery, type SiteCatalogContext } from './types'

const IMG = {
  barn90:
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
  barn113:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  swedish:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
}

function project(
  partial: Omit<CatalogProject, 'href' | 'priceLabel' | 'options'> & { options?: CatalogProject['options'] },
): CatalogProject {
  return {
    ...partial,
    href: `/projects/${partial.slug}`,
    priceLabel: partial.priceAmount == null ? '\u0426\u0435\u043d\u0430 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443' : `\u043e\u0442 ${formatRub(partial.priceAmount)}`,
    options: partial.options ?? [
      { id: 'base', name: '\u0411\u0430\u0437\u043e\u0432\u0430\u044f \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0430\u0446\u0438\u044f', price: 0, defaultSelected: true },
      { id: 'terrace', name: '\u0422\u0435\u0440\u0440\u0430\u0441\u0430', price: 180000, defaultSelected: false },
      { id: 'smart', name: '\u0423\u043c\u043d\u044b\u0439 \u0434\u043e\u043c', price: 95000, defaultSelected: false },
    ],
  }
}

const FIXTURES: CatalogProject[] = [
  project({
    id: 'barn-90',
    slug: 'barn-90',
    name: '\u041c\u043e\u0434\u0443\u043b\u044c\u043d\u044b\u0439 \u0434\u043e\u043c \u0411\u0430\u0440\u043d\u0445\u0430\u0443\u0441 90',
    area: '89,9 \u043c\u00b2',
    areaValue: 89.9,
    floors: '1',
    floorsValue: 1,
    bedrooms: '3',
    bathrooms: '4',
    priceAmount: 4213000,
    imageUrl: IMG.barn90,
    technologyBadge: '\u042d\u0441\u043a\u0440\u043e\u0443',
    description:
      '\u041e\u0434\u043d\u043e\u044d\u0442\u0430\u0436\u043d\u044b\u0439 \u043c\u043e\u0434\u0443\u043b\u044c\u043d\u044b\u0439 \u0434\u043e\u043c \u0441 \u0442\u0435\u0440\u0440\u0430\u0441\u043e\u0439 \u0438 \u0433\u043e\u0442\u043e\u0432\u043e\u0439 \u0437\u0430\u0432\u043e\u0434\u0441\u043a\u043e\u0439 \u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442\u0430\u0446\u0438\u0435\u0439.',
    exteriors: [IMG.barn90, IMG.barn113],
    interiors: [IMG.swedish, IMG.barn90],
    floorPlans: [IMG.barn113],
  }),
  project({
    id: 'barn-113',
    slug: 'barn-113',
    name: '\u041c\u043e\u0434\u0443\u043b\u044c\u043d\u044b\u0439 \u0434\u043e\u043c \u0411\u0430\u0440\u043d\u0445\u0430\u0443\u0441 113',
    area: '115,6 \u043c\u00b2',
    areaValue: 115.6,
    floors: '2',
    floorsValue: 2,
    bedrooms: '3',
    bathrooms: '4',
    priceAmount: 4567000,
    imageUrl: IMG.barn113,
    technologyBadge: '\u042d\u0441\u043a\u0440\u043e\u0443',
    description: '\u0414\u0432\u0443\u0445\u044d\u0442\u0430\u0436\u043d\u044b\u0439 \u0431\u0430\u0440\u043d\u0445\u0430\u0443\u0441 \u0441 \u0432\u0442\u043e\u0440\u044b\u043c \u0441\u0432\u0435\u0442\u043e\u043c \u0438 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0439 \u043c\u0430\u0441\u0442\u0435\u0440-\u0441\u043f\u0430\u043b\u044c\u043d\u0435\u0439.',
    exteriors: [IMG.barn113, IMG.barn90],
    interiors: [IMG.swedish],
    floorPlans: [IMG.barn90, IMG.barn113],
  }),
  project({
    id: 'swedish-95',
    slug: 'swedish-95',
    name: '\u0428\u0432\u0435\u0434\u0441\u043a\u0438\u0439 95',
    area: '127,3 \u043c\u00b2',
    areaValue: 127.3,
    floors: '1-2',
    floorsValue: 2,
    bedrooms: '3',
    bathrooms: '3',
    priceAmount: 3514000,
    imageUrl: IMG.swedish,
    technologyBadge: '\u042d\u0441\u043a\u0440\u043e\u0443',
    description: '\u0421\u043a\u0430\u043d\u0434\u0438\u043d\u0430\u0432\u0441\u043a\u0430\u044f \u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u043a\u0430 \u0441 \u043a\u0443\u0445\u043d\u0435\u0439-\u0433\u043e\u0441\u0442\u0438\u043d\u043e\u0439 \u0438 \u0432\u0442\u043e\u0440\u044b\u043c \u0443\u0440\u043e\u0432\u043d\u0435\u043c.',
    exteriors: [IMG.swedish],
    interiors: [IMG.barn90, IMG.barn113],
    floorPlans: [IMG.swedish],
  }),
]

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

export function createCatalogProvider(): ProjectCatalogProvider {
  return new FixtureCatalogProvider()
}
