import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconArrowUpRight,
  IconBath,
  IconBed,
  IconChevronRight,
  IconRulerMeasure,
  IconStairs,
} from '@tabler/icons-react'
import { ProjectActions } from '../../../components/project-actions'
import { SiteChrome } from '../../../components/site-chrome'
import { FixtureCatalogProvider } from '../../../lib/catalog/fixture-provider'
import { copy, footerAboutFor } from '../../../lib/copy'
import { splitProjectName } from '../../../lib/project-name'
import { SITE } from '../../../lib/site'

const catalog = new FixtureCatalogProvider()

export async function generateStaticParams() {
  const { items } = await catalog.list({ siteCode: SITE.code })
  return items.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await catalog.getBySlug(slug, { siteCode: SITE.code })
  if (!project) return { title: copy.notFound }
  return { title: project.name, description: project.description }
}

/**
 * Карточка проекта.
 *
 * Разметка опирается на готовые классы `.project-hero`: кадр на весь первый
 * экран, крошки, значок технологии, заголовок и стеклянная плашка с ТТХ и
 * ценой. Ниже — описание и фасады. Комплектации и планировки появятся
 * вместе с макетом карточки, когда по фото будет понятно, что есть план,
 * а что интерьер.
 */
export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await catalog.getBySlug(slug, { siteCode: SITE.code })
  if (!project) notFound()

  // Маркировка в заголовке идёт фирменным жёлтым: правило .project-hero h1 span
  // уже есть в стилях, нужно лишь отделить число от слова.
  const { head, mark } = splitProjectName(project.name)

  const specs = [
    { icon: IconRulerMeasure, label: copy.area, value: `${project.area} ${copy.specArea}` },
    { icon: IconStairs, label: copy.floorsLabel, value: project.floors },
    { icon: IconBed, label: copy.bedrooms, value: project.bedrooms },
    { icon: IconBath, label: copy.bathrooms, value: project.bathrooms },
  ]

  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
      subrow={
        /* Ряд собирает SiteChrome — сюда отдаются только два кластера,
           крошки и действия, чтобы подложка встала под каждый из них. */
        <>
          <nav className="project-hero__crumbs" aria-label={copy.crumbsAria}>
            <Link href="/">{copy.breadcrumbsHome}</Link>
            <IconChevronRight size={14} stroke={2} aria-hidden="true" />
            <Link href="/catalog">{copy.breadcrumbsCatalog}</Link>
            <IconChevronRight size={14} stroke={2} aria-hidden="true" />
            {/* Текущая страница — не ссылка: вести с неё на неё же
                некуда, и aria-current сообщает это программам чтения. */}
            <span aria-current="page">{project.name}</span>
          </nav>
          <ProjectActions project={project} stats={{ likes: 0, shares: 0 }} />
        </>
      }
    >
      <main>
        <section className="project-hero">
          <img src={project.imageUrl} alt="" />
          <div className="project-hero__veil" />
          <div className="project-hero__stage">
            <div className="project-hero__intro">
              <p className="project-hero__badge">{project.technologyBadge}</p>
              <h1>
                {head}
                {mark ? <span>{mark}</span> : null}
              </h1>
            </div>

            <div className="project-hero__bar">
              <ul className="project-hero__specs">
                {specs.map((spec) => {
                  const Icon = spec.icon
                  return (
                    <li key={spec.label}>
                      <Icon size={22} stroke={1.6} aria-hidden="true" />
                      <div>
                        <p>{spec.label}</p>
                        <strong>{spec.value}</strong>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="project-hero__aside">
                <div className="project-hero__price">
                  <p>{copy.cost}</p>
                  <strong>{project.priceLabel}</strong>
                </div>
                <Link className="btn btn-yellow project-hero__cta" href="/#contacts">
                  {copy.getQuote}
                  <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__inner">
            <h2>{project.name}</h2>
            <p className="info-page__lead">{project.description}</p>
          </div>
        </section>

        {project.exteriors.length ? (
          <section className="section">
            <div className="section__inner">
              <p className="eyebrow">{copy.exteriors}</p>
              <div className="project-gallery">
                {project.exteriors.map((src) => (
                  <img key={src} src={src} alt="" loading="lazy" decoding="async" />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </SiteChrome>
  )
}
