import type { Payload } from 'payload'
import { resolveSiteByHost, type SiteHostRecord } from './host'

export async function loadSiteForHost(payload: Payload, hostHeader: string, includeDrafts: boolean) {
  const sites = await payload.find({
    collection: 'sites',
    limit: 100,
    depth: 1,
    overrideAccess: includeDrafts,
  })
  const records: SiteHostRecord[] = sites.docs.map((doc) => ({
    code: String(doc.code),
    status: String(doc.status),
    subdomain: doc.subdomain ? String(doc.subdomain) : null,
    customDomains: doc.customDomains,
  }))
  const match = resolveSiteByHost(records, hostHeader, { includeDrafts })
  if (!match) return null
  return sites.docs.find((doc) => doc.code === match.code) ?? null
}
