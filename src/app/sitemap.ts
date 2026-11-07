import type { MetadataRoute } from 'next'
import { unstable_rethrow } from 'next/navigation'
import { CmsCatalogProvider } from '../lib/catalog/cms-provider'
import { EXPOSITION_PLACES } from '../lib/exposition'
import { SITE } from '../lib/site'
import { isCMSUnavailable } from '../server/cms-request'

const ORIGIN = 'https://avgst.ru'

const PAGES = [
  '/',
  '/catalog',
  '/about',
  '/manufacture',
  '/exposition',
  '/business',
  '/family-mortgage',
  '/it-mortgage',
  '/basic-mortgage',
  '/stories',
  '/dealers',
  '/referral',
  '/factory-open-day',
  '/privacy',
  '/cookies',
]

function projectPath(slug: string): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  return `/catalog/${slug}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await new CmsCatalogProvider()
    .list({ siteCode: SITE.code })
    .then(result => result.items)
    .catch((error: unknown) => {
      unstable_rethrow(error)
      if (!isCMSUnavailable(error)) throw error
      return []
    })
  const paths = [
    ...PAGES,
    ...EXPOSITION_PLACES.map(place => `/exposition/${place.slug}`),
    ...projects.flatMap(project => {
      const path = projectPath(project.slug)
      return path ? [path] : []
    }),
  ]
  return [...new Set(paths)].map(path => ({ url: path === '/' ? ORIGIN : `${ORIGIN}${path}` }))
}
