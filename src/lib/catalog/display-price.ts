import type { CatalogProject } from './types'

/** Customer prices for cards and catalog filtering; mortgage prices stay untouched. */
export function catalogDisplayPrice(project: Pick<CatalogProject, 'priceAmount' | 'regionalPrices' | 'regionalSpecialPrices' | 'readyHome'>, region: 'nn' | 'msk' = 'nn'): number | null {
  const price = project.readyHome ? project.readyHome.salePrice
    : project.regionalSpecialPrices !== undefined ? project.regionalSpecialPrices[region]
      : project.regionalPrices ? project.regionalPrices[region] : project.priceAmount
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : null
}

export function catalogDisplayPrices(project: Parameters<typeof catalogDisplayPrice>[0]) {
  return Object.fromEntries((['nn', 'msk'] as const).flatMap(region => {
    const price = catalogDisplayPrice(project, region)
    return price === null ? [] : [[region, price]]
  })) as Partial<Record<'nn' | 'msk', number>>
}
