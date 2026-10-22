import type { Project, ProjectPrice } from '../payload-types'
import { catalogPrice } from './catalog-price'
import { isPublicPriceKind } from './price-kinds'

export function catalogMediaURL(photo: unknown, fallback?: string | null): string {
  const url = typeof photo === 'object' && photo && 'url' in photo && typeof photo.url === 'string' ? photo.url : fallback
  try { return url ? new URL(url, process.env.CMS_PUBLIC_URL).href : '' } catch { return '' }
}
/** Shared by the public DTO and authoritative decision reads; no second price formula. */
export function catalogPublicPrices(record: Project, prices: ProjectPrice[]) {
  const rows = prices.filter(row => (typeof row.project === 'number' ? row.project : row.project.id) === record.id && row.configuration === 'standard' && isPublicPriceKind(row.region))
  const price = catalogPrice(record, rows.find(row => row.region === 'nn')?.price)
  const regionalPrices = Object.fromEntries(rows.map(row => [row.region, row.price]))
  if (!('nn' in regionalPrices) && price && price > 0) regionalPrices.nn = price
  return { price, regionalPrices }
}
