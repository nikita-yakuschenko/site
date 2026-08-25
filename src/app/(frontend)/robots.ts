import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canonicalUrl } from '../../lib/canonical'
import { loadSiteForHost } from '../../lib/request-site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const site = await loadSiteForHost(payload, host, false)
  const sitemap = canonicalUrl(host, '/sitemap.xml')
  if (!site || site.status !== 'published') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/next/'] },
    sitemap,
  }
}
