import type { CatalogTechnology } from '../catalog/types'
import type { ConfigurationKey } from '../catalog/configuration-rules'
import type { RegionCode } from '../regions'

export type PassportTier = {
  key: ConfigurationKey
  name: string
  priceLabel: string
  mortgagePaymentLabel?: string | null
  regularPriceLabel?: string
  special: boolean
  regularPrice: number
  specialPrice: number | null
  displayedPrice: number
}
export type PassportPricing = {
  mortgagePaymentLabel: string | null
  mortgageNote: string
  standardMortgageBasePrice: number
  monthlyMortgagePayment: number | null
  tiers: [PassportTier, PassportTier, PassportTier]
}
export type PassportData = {
  schemaVersion: 1
  project: {
    slug: string; name: string; url: string; technology: CatalogTechnology; technologyLabel: string
    areaLabel: string; floorsLabel: string; bedroomsLabel: string; bathroomsLabel: string; heroImage: string
  }
  region: { code: RegionCode; name: string }
  pricing: PassportPricing
  plans: { id: string; name: string; floors: { id: string; name: string; image: string; rooms: { number: number; name: string; areaLabel: string }[] }[] }[]
  comparison: {
    rows: { id: string; section?: string; label: string; values: [string, string, string]; note?: string; noteFacts?: string[]; cells?: { status: string; label: string; details: string[] }[] }[]
    /** Required positions absent from the source matrix, never inferred as excluded. */
    sourceGaps?: { id: string; label: string; status: 'requiresVerification'; sourceStatus: 'needsVerification' }[]
  }
  contacts: {
    company: string; phone: string; phoneHref: string; email: string; address: string
    website: string; about: string; legal: string; updatedAt: string
    socials: { label: string; href: string }[]
  }
  /** Path relative to public/, for the renderer's local asset resolver. */
  brand: { logo: string }
}

export class PassportDataError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'PassportDataError'
  }
}
