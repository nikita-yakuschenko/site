import type { PayloadRequest } from 'payload'
import type { Project, ProjectPrice } from '../payload-types'
import { isRecordId } from '../../../src/lib/record-id'
import { catalogMediaURL, catalogPublicPrices } from '../config/catalog-public-facts'
import type { OptimizationRegion } from '../../../src/lib/optimization/contracts'

export type EligibleCandidate = { projectId: number; projectCode: string; series: string; price: number; imageUrl: string }
export type EligibilityReason = 'draft' | 'ready_home' | 'missing_code' | 'missing_cover' | 'missing_region_price' | 'editor_excluded' | 'invalid_data'
export type CandidateSnapshot = { status: 'available'; candidates: EligibleCandidate[]; excluded: { projectId: number; reason: EligibilityReason }[] } | { status: 'unavailable' }
export function projectEligibility(record: Project, prices: ProjectPrice[], region: OptimizationRegion, exclusions: ReadonlySet<string> = new Set()): EligibleCandidate | EligibilityReason {
  if (record._status !== 'published') return 'draft'
  if (record.recordType !== 'project') return 'ready_home'
  if (!isRecordId(record.code)) return 'missing_code'
  if (exclusions.has(record.code)) return 'editor_excluded'
  const imageUrl = catalogMediaURL(record.desktopImage, record.imageUrl)
  if (!/^https?:\/\//.test(imageUrl)) return 'missing_cover'
  const price = catalogPublicPrices(record, prices).regionalPrices[region]
  if (!Number.isFinite(price) || !(price > 0)) return 'missing_region_price'
  if (!Number.isSafeInteger(record.id) || record.id <= 0 || !(record.areaValue > 0)) return 'invalid_data'
  return { projectId: record.id, projectCode: record.code, series: record.series || 'unclassified', price, imageUrl }
}
/** Fresh authoritative CMS reads: never use the site's cached catalogue as publication evidence. */
export async function readAuthoritativeCandidates(req: PayloadRequest, region: OptimizationRegion, exclusions: ReadonlySet<string> = new Set()): Promise<CandidateSnapshot> {
  try {
    const projects = await req.payload.find({ collection: 'projects', pagination: false, depth: 1, overrideAccess: true, req, where: { _status: { equals: 'published' } } })
    const prices = await req.payload.find({ collection: 'project-prices', pagination: false, depth: 0, overrideAccess: true, req })
    const candidates: EligibleCandidate[] = [], excluded: { projectId: number; reason: EligibilityReason }[] = []
    const codes = new Set<string>()
    for (const project of projects.docs) {
      const eligibility = projectEligibility(project, prices.docs, region, exclusions)
      if (typeof eligibility === 'string') excluded.push({ projectId: project.id, reason: eligibility })
      else if (codes.has(eligibility.projectCode)) return { status: 'unavailable' }
      else { candidates.push(eligibility); codes.add(eligibility.projectCode) }
    }
    return { status: 'available', candidates, excluded }
  } catch { return { status: 'unavailable' } }
}
