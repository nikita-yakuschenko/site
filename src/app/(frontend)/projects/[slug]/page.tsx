import { draftMode, headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { LeadForm } from '../../../../components/lead-form'
import { PreviewBanner } from '../../../../components/preview-banner'
import { ProjectConfigurator } from '../../../../components/project-configurator'
import { ProjectGallery } from '../../../../components/project-gallery'
import { ProjectHero } from '../../../../components/project-hero'
import { SiteChrome } from '../../../../components/site-chrome'
import { createCatalogProvider } from '../../../../lib/catalog/fixture-provider'
import { canonicalUrl } from '../../../../lib/canonical'
import { copy, footerAboutFor } from '../../../../lib/copy'
import { OG_LOCALE } from '../../../../lib/locale'
import { loadSiteForHost } from '../../../../lib/request-site'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const { isEnabled: isDraft } = await draftMode()
  const site = await loadSiteForHost(payload, host, isDraft)
  const project = await createCatalogProvider().getBySlug(slug, { siteCode: String(site?.code || 'corporate') })
  if (!project) return { title: 'Авангард Строй' }
  const title = project.name
  const description = project.description
  const url = canonicalUrl(host, project.href)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, locale: OG_LOCALE, images: [{ url: project.imageUrl }] },
  }
}

export default async function ProjectPage({ params }: Args) {
  const { slug } = await params
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost'
  const payload = await getPayload({ config })
  const { isEnabled: isDraft } = await draftMode()
  const site = await loadSiteForHost(payload, host, isDraft)
  if (!site) notFound()

  const project = await createCatalogProvider().getBySlug(slug, { siteCode: String(site.code) })
  if (!project) notFound()

  const editorial = await payload.find({
    collection: 'project-content',
    where: {
      and: [{ site: { equals: site.id } }, { externalProjectId: { equals: project.id } }],
    },
    limit: 1,
    depth: 1,
  })
  const overlay = editorial.docs[0]
  const title = overlay?.editorialTitle || project.name
  const description = overlay?.editorialDescription || project.description
  const extraImages = (overlay?.additionalMedia || [])
    .map((row) => (typeof row.image === 'object' && row.image?.url ? row.image.url : ''))
    .filter(Boolean)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    image: project.imageUrl,
    offers: project.priceAmount
      ? { '@type': 'Offer', priceCurrency: 'RUB', price: project.priceAmount }
      : undefined,
  }

  return (
    <>
      {isDraft ? <PreviewBanner /> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteChrome
        name={site.name}
        logo={site.brand?.logo}
        phone={site.contacts?.phone}
        email={site.contacts?.email}
        address={site.contacts?.address}
        navigation={site.navigation}
        overlay
        footer={site.footer?.legal}
        about={footerAboutFor(site.name)}
      >
        <ProjectHero project={project} title={title} />
        <section className="section">
          <div className="section__inner glass-panel">
            <p>{description}</p>
          </div>
        </section>
        <ProjectGallery title={copy.exteriors} images={[...project.exteriors, ...extraImages]} />
        <ProjectGallery title={copy.interiors} images={project.interiors} />
        <ProjectGallery title={copy.floorPlans} images={project.floorPlans} />
        <ProjectConfigurator options={project.options} basePrice={project.priceAmount} />
        <section className="section" id="lead">
          <div className="section__inner contacts">
            <LeadForm
              siteId={site.id}
              projectExternalId={project.id}
              heading={copy.haveQuestion}
              body={copy.haveQuestionBody}
              submitLabel={copy.askQuestion}
              variant="card"
            />
          </div>
        </section>
      </SiteChrome>
    </>
  )
}
