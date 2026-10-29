import 'server-only'
import { cache } from 'react'
import { connection } from 'next/server'
import { FixtureCatalogProvider } from './fixture-provider'
import { CATALOG_PROJECTS } from './projects'
import { readCMSJSON } from '../cms/request'
import { CMSUnavailableError, decodeCatalog, recordCMSFailure } from '../../server/cms-request'
import type { CatalogProject, ProjectCatalogProvider, ProjectQuery, SiteCatalogContext } from './types'
import { planRequestFixturesEnabled } from '../plan-request-feature'

const readCatalog = cache(async (slug?: string): Promise<CatalogProject[]> => {
  // CI's production-build browser gate uses published-shape fixtures without
  // granting untrusted pull-request code access to the production CMS token.
  if (process.env.BROWSER_DIAGNOSTICS_FIXTURE_CATALOG === '1' || planRequestFixturesEnabled()) {
    const projects = CATALOG_PROJECTS.map(project => ({ ...project, regionalSpecialPrices: project.technology === 'modular' ? { nn: 850_000, msk: 1_250_000 } : { nn: 1_700_000, msk: 2_100_000 } }))
    return slug ? projects.filter(project => project.slug === slug) : projects
  }
  // CMS records are added after deployment; always read them at request time.
  await connection()
  const key = process.env.CMS_SITE_API_KEY
  if (!key) {
    recordCMSFailure('catalog', 'not-configured')
    throw new CMSUnavailableError('catalog', 'not-configured')
  }
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  return readCMSJSON('catalog', `${origin}/api/projects/catalog${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 60 }, signal: AbortSignal.timeout(15000) }, decodeCatalog)
})

export class CmsCatalogProvider implements ProjectCatalogProvider {
  async list(query: ProjectQuery) {
    // Reuse filtering and ordering, supplying only records obtained from CMS.
    return new FixtureCatalogProvider(await readCatalog()).list(query)
  }
  async getBySlug(slug: string, _context: SiteCatalogContext): Promise<CatalogProject | null> {
    // These names cannot exist under the CMS slug contract; no upstream lookup is needed.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
    return (await readCatalog(slug))[0] || null
  }
}
