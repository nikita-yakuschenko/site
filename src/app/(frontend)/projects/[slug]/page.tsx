import { draftMode, headers } from 'next/headers'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { LeadForm } from '../../../../components/lead-form'
import { PreviewBanner } from '../../../../components/preview-banner'
import { ProjectConfigurator } from '../../../../components/project-configurator'
import { ProjectGallery } from '../../../../components/project-gallery'
import { SiteChrome } from '../../../../components/site-chrome'
import { createCatalogProvider } from '../../../../lib/catalog/fixture-provider'
import { canonicalUrl } from '../../../../lib/canonical'
import { copy } from '../../../../lib/copy'
import { splitProjectName } from '../../../../lib/media'
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
  if (!project) return { title: 'AVGST' }
  const title = project.name
  const description = project.description
  const url = canonicalUrl(host, project.href)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: [{ url: project.imageUrl }] },
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
  const { text, digits } = splitProjectName(title)

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
        navigation={site.navigation}
        overlay
        footer={site.footer?.legal}
      >
        <section className="hero hero--large">
          <img src={project.imageUrl} alt="" />
          <div className="hero__veil" />
          <div className="hero__content">
            <nav className="crumbs" aria-label="Breadcrumb">
              <a href="/">{copy.breadcrumbsHome}</a>
              <span>/</span>
              <a href="/projects">{copy.breadcrumbsCatalog}</a>
            </nav>
            <p className="badge badge--on-dark">{project.technologyBadge}</p>
            <h1>
              {text} {digits ? <span className="hero__green">{digits}</span> : null}
            </h1>
            <ul className="specs specs--on-dark">
              <li>{project.area}</li>
              <li>{project.floors}</li>
              <li>{project.bedrooms}</li>
              <li>{project.bathrooms}</li>
            </ul>
            <p className="price price--on-dark">{project.priceLabel}</p>
            <a className="btn btn-yellow" href="#lead">
              {copy.consult}
            </a>
          </div>
        </section>
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
          <div className="section__inner">
            <LeadForm siteId={site.id} projectExternalId={project.id} heading={copy.consult} />
          </div>
        </section>
      </SiteChrome>
    </>
  )
}
