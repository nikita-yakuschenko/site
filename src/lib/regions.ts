import { copy } from './copy'

export const REGIONS = [
  { code: 'nn', name: copy.regionNn, mark: '/regions/nn2.svg', tone: 'dark' },
  { code: 'msk', name: copy.regionMsk, mark: '/regions/msk.svg', tone: 'light' },
] as const

export type RegionCode = (typeof REGIONS)[number]['code']
export type RegionTone = (typeof REGIONS)[number]['tone']

const STORAGE_KEY = 'avgst:region'

export function regionByCode(code: string | null): (typeof REGIONS)[number] {
  return REGIONS.find((region) => region.code === code) || REGIONS[0]
}

export function readRegionCode(): RegionCode {
  if (typeof window === 'undefined') return 'nn'
  try {
    return regionByCode(window.localStorage.getItem(STORAGE_KEY)).code
  } catch {
    return 'nn'
  }
}

export function writeRegionCode(code: RegionCode): void {
  window.localStorage.setItem(STORAGE_KEY, code)
}
