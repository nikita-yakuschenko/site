import type { CatalogProject } from './types'

/** Карточки и фильтры каталога берут ту же базовую цену, что и страница проекта. */
export function catalogDisplayPrice(project: Pick<CatalogProject, 'priceAmount' | 'regionalPrices' | 'regionalSpecialPrices' | 'readyHome'>, region: 'nn' | 'msk' = 'nn'): number | null {
  const price = project.readyHome ? project.readyHome.salePrice
    : project.regionalPrices ? project.regionalPrices[region] ?? project.priceAmount
      : project.priceAmount
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null
}

export function catalogDisplayPrices(project: Parameters<typeof catalogDisplayPrice>[0]) {
  return Object.fromEntries((['nn', 'msk'] as const).flatMap(region => {
    const price = catalogDisplayPrice(project, region)
    return price === null ? [] : [[region, price]]
  })) as Partial<Record<'nn' | 'msk', number>>
}
