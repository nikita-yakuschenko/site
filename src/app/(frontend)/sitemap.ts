import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canonicalUrl } from '../../lib/canonical'
import { loadSiteForHost } from '../../lib/request-site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const site = await loadSiteForHost(payload, host, false)
  if (!site) return []

  const pages = await payload.find({
    collection: 'pages',
    where: {
      and: [{ site: { equals: site.id } }, { _status: { equals: 'published' } }],
    },
    limit: 500,
    depth: 0,
    draft: false,
  })

  const entries: MetadataRoute.Sitemap = pages.docs.map((page) => ({
    url: canonicalUrl(host, page.fullPath || '/'),
    lastModified: page.updatedAt,
  }))
  entries.push({ url: canonicalUrl(host, '/projects') })
  return entries
}
