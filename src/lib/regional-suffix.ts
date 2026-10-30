import type { TrafficRegion } from './region-traffic'

export const DEFAULT_REGIONAL_SUFFIX = {
  nn: 'в Нижнем Новгороде и области',
  msk: 'в Москве и Московской области',
} as const
export type RegionalSuffix = Record<TrafficRegion, string>

/** Do not infer a region from a city name, prices, UTM or an NN fallback. */
export function regionFromGeoResponse(value: unknown): TrafficRegion | null {
  if (!value || typeof value !== 'object') return null
  const data = value as { country?: { iso?: unknown }; region?: { iso?: unknown }; error?: unknown }
  if (data.error || data.country?.iso !== 'RU') return null
  if (data.region?.iso === 'RU-NIZ') return 'nn'
  if (data.region?.iso === 'RU-MOW' || data.region?.iso === 'RU-MOS') return 'msk'
  return null
}

export function regionalSuffixFor(region: TrafficRegion | null, suffix: RegionalSuffix = DEFAULT_REGIONAL_SUFFIX) {
  return region ? suffix[region].replace(/\s+/g, ' ').trim() : ''
}
