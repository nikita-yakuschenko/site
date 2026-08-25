import { draftMode, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'
import config from '@payload-config'
import { BlockRenderer, type LayoutBlock } from '../../../components/block-renderer'
import { PreviewBanner } from '../../../components/preview-banner'
import { RefreshRouteOnSave } from '../../../components/refresh-preview'
import { SiteChrome } from '../../../components/site-chrome'
import { createCatalogProvider } from '../../../lib/catalog/fixture-provider'
import { canonicalUrl } from '../../../lib/canonical'
import { loadSiteForHost } from '../../../lib/request-site'

type Args = { params: Promise<{ slug?: string[] }> }

function pathFromSlug(slug?: string[]): string {
  if (!slug?.length) return '/'
  return `/${slug.join('/')}`
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const resolved = await loadPage(pathFromSlug(slug))
  const { isEnabled: isDraft } = await draftMode()
  if (!resolved?.page) return { title: 'AVGST', robots: isDraft ? { index: false, follow: false } : undefined }
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const title = resolved.page.seo?.title || resolved.page.title || resolved.site.defaultSeo?.title || resolved.site.name
  const description = resolved.page.seo?.description || resolved.site.defaultSeo?.description || ''
  const canonical = resolved.page.seo?.canonical || canonicalUrl(host, resolved.page.fullPath || '/')
  return {
    title,
    description,
    alternates: { canonical },
    robots: isDraft || resolved.page.seo?.robots === 'noindex' ? { index: false, follow: false } : { index: true },
    openGraph: { title, description, url: canonical },
  }
}

async function loadPage(fullPath: string) {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const { isEnabled: isDraft } = await draftMode()
  const siteDoc = await loadSiteForHost(payload, host, isDraft)
  if (!siteDoc) return null

  const pages = await payload.find({
    collection: 'pages',
    where: {
      and: [{ site: { equals: siteDoc.id } }, { fullPath: { equals: fullPath } }],
    },
    limit: 1,
    depth: 2,
    draft: isDraft,
    overrideAccess: isDraft,
  })
  return { site: siteDoc, page: pages.docs[0] || null }
}

export default async function Page({ params }: Args) {
  const { slug } = await params
  const resolved = await loadPage(pathFromSlug(slug))
  const { isEnabled: isDraft } = await draftMode()
  if (!resolved?.page) notFound()

  const ids = (resolved.page.layout || [])
    .filter((block) => block.blockType === 'popularProjects' || block.blockType === 'projectsCatalog')
    .flatMap((block) => {
      const rows = (block as { projectIds?: Array<{ id?: string }> }).projectIds || []
      return rows.map((row) => row.id).filter((id): id is string => Boolean(id))
    })

  const catalog = createCatalogProvider()
  const { items } = await catalog.list({
    siteCode: String(resolved.site.code),
    ids: ids.length ? ids : undefined,
    limit: 12,
  })
  const hasHero = (resolved.page.layout || []).some((block) => block.blockType === 'hero')

  return (
    <>
      {isDraft ? <PreviewBanner /> : null}
      {isDraft ? <RefreshRouteOnSave /> : null}
      <SiteChrome
        name={resolved.site.name}
        logo={resolved.site.brand?.logo}
        phone={resolved.site.contacts?.phone}
        navigation={resolved.site.navigation}
        overlay={hasHero}
        footer={resolved.site.footer?.legal}
      >
        <main>
          <BlockRenderer
            blocks={(resolved.page.layout || []) as unknown as LayoutBlock[]}
            projects={items}
            contacts={resolved.site.contacts}
            siteId={resolved.site.id}
            pageId={resolved.page.id}
          />
        </main>
      </SiteChrome>
    </>
  )
}
