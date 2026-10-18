import { isCatalogSeries } from './types'

/** Подборка — не свойство дома, а признак отбора.
 *  Панельные и модульные собраны по технологии: один дом может быть
 *  одновременно классическим и модульным. Остальные плитки пока смотрят на серию. */
export function isTechnologyCollection(token: string): token is 'panel' | 'modular' {
  return token === 'panel' || token === 'modular'
}

export function countCollectionProjects(items: readonly { technology: string; series: string }[], collection: string): number {
  return items.filter(item => isTechnologyCollection(collection) ? item.technology === collection : item.series === collection).length
}

export function collectionHref(token: string): string {
  if (isTechnologyCollection(token)) return `/catalog?tech=${token}`
  if (isCatalogSeries(token)) return `/catalog?series=${token}`
  return '/catalog'
}
