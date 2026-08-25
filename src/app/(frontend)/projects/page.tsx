import { draftMode, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { CatalogFilters } from '../../../components/catalog-filters'
import { PreviewBanner } from '../../../components/preview-banner'
import { ProjectCard } from '../../../components/project-card'
import { SiteChrome } from '../../../components/site-chrome'
import { createCatalogProvider } from '../../../lib/catalog/fixture-provider'
import { canonicalUrl } from '../../../lib/canonical'
import { copy } from '../../../lib/copy'
import { loadSiteForHost } from '../../../lib/request-site'

type Args = { searchParams: Promise<{ floors?: string; minArea?: string }> }

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  return {
    title: copy.catalog,
    alternates: { canonical: canonicalUrl(host, '/projects') },
  }
}

export default async function CatalogPage({ searchParams }: Args) {
  const params = await searchParams
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const { isEnabled: isDraft } = await draftMode()
  const site = await loadSiteForHost(payload, host, isDraft)
  if (!site) notFound()

  const floors = params.floors ? Number(params.floors) : undefined
  const minArea = params.minArea ? Number(params.minArea) : undefined
  const catalog = createCatalogProvider()
  const { items } = await catalog.list({
    siteCode: String(site.code),
    floors: Number.isFinite(floors) ? floors : undefined,
    minArea: Number.isFinite(minArea) ? minArea : undefined,
  })

  return (
    <>
      {isDraft ? <PreviewBanner /> : null}
      <SiteChrome
        name={site.name}
        logo={site.brand?.logo}
        phone={site.contacts?.phone}
        navigation={site.navigation}
        footer={site.footer?.legal}
      >
        <main className="section">
          <div className="section__inner">
            <p className="eyebrow">{site.name}</p>
            <h1>{copy.catalog}</h1>
            <CatalogFilters floors={params.floors} minArea={params.minArea} />
            <div className="grid-3">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </main>
      </SiteChrome>
    </>
  )
}
