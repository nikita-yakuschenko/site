import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { unstable_rethrow } from 'next/navigation'
import { FixtureCatalogProvider } from './fixture-provider'
import { CATALOG_PROJECTS } from './projects'
import type { CatalogProject, ProjectCatalogProvider, ProjectQuery, SiteCatalogContext } from './types'

const readCatalog = cache(async (slug?: string): Promise<CatalogProject[]> => {
  // CI's production-build browser gate uses published-shape fixtures without
  // granting untrusted pull-request code access to the production CMS token.
  if (process.env.BROWSER_DIAGNOSTICS_FIXTURE_CATALOG === '1') {
    return slug ? CATALOG_PROJECTS.filter(project => project.slug === slug) : CATALOG_PROJECTS
  }
  // CMS records are added after deployment; always read them at request time.
  await connection()
  const key = process.env.CMS_SITE_API_KEY
  if (!key) return []
  try {
    const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
    const response = await fetch(`${origin}/api/projects/catalog${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(15000) })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data.items) ? data.items : []
  } catch (error) { unstable_rethrow(error); return [] }
})

export class CmsCatalogProvider implements ProjectCatalogProvider {
  async list(query: ProjectQuery) {
    // Reuse filtering and ordering, supplying only records obtained from CMS.
    return new FixtureCatalogProvider(await readCatalog()).list(query)
  }
  async getBySlug(slug: string, _context: SiteCatalogContext): Promise<CatalogProject | null> {
    return (await readCatalog(slug))[0] || null
  }
}
