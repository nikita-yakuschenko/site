import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconBath,
  IconBed,
  IconChevronRight,
  IconRulerMeasure,
  IconStairs,
} from '@tabler/icons-react'
import {
  ProjectExteriors,
  ProjectInteriors,
} from '../../../components/project-media'
import { ProjectPlans } from '../../../components/project-plans'
import { ProjectBuilt } from '../../../components/project-built'
import { ProjectConfig } from '../../../components/project-config'
import { ProjectNextSteps } from '../../../components/project-next-steps'
import { ProjectSimilar } from '../../../components/project-similar'
import { ContactsSection } from '../../../components/block-renderer'
import { MortgageCalculator } from '../../../components/mortgage-calculator'
import { tiersForProject } from '../../../lib/catalog/tiers'
import { ProjectActions } from '../../../components/project-actions'
import { SiteChrome } from '../../../components/site-chrome'
import { FixtureCatalogProvider } from '../../../lib/catalog/fixture-provider'
import type { CatalogProject } from '../../../lib/catalog/types'
import { copy, footerAboutFor } from '../../../lib/copy'
import { monthlyPaymentForProject } from '../../../lib/mortgage'
import { formatRub } from '../../../lib/locale'
import { readServerRegionCode } from '../../../lib/regions'
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

  const { items: catalogProjects } = await catalog.list({ siteCode: SITE.code })
  const similarProjects = catalogProjects
    .filter((item) => item.id !== project.id)
    .sort((a, b) => similarityScore(project, a) - similarityScore(project, b))
    .slice(0, 6)

  // Маркировка в заголовке идёт фирменным жёлтым: правило .project-hero h1 span
  // уже есть в стилях, нужно лишь отделить число от слова.
  const { head, mark } = splitProjectName(project.name)

  /* Платёж считается на сервере, от самой дешёвой комплектации, доступной
     в ипотеку: стартовая — это каркас, а банк кредитует дом. Регион
     берётся серверный, на самой странице ипотеки его можно сменить. */
  const tiers = tiersForProject(project)
  const mortgagePrices = tiers?.filter((tier) => tier.mortgage).map((tier) => tier.price)
  const basePrice = mortgagePrices?.length ? Math.min(...mortgagePrices) : null
  const standardPrice = tiers?.find((tier) => tier.id === 'standard')?.price ?? null
  const payment = basePrice
    ? monthlyPaymentForProject({
        propertyPrice: basePrice,
        region: readServerRegionCode(),
      })
    : null

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
              {/* Здесь только платёж. Кнопка расчёта убрана, полная цена
                  тоже: рядом с платежом она шла мелкой строкой и обе цены
                  проигрывали друг другу. Полной стоимости место ниже по
                  странице, где под неё можно дать состав комплектации. */}
              <div className="project-hero__aside">
                {/* Подпись над суммой, как у характеристик слева: без неё
                    число висело само по себе и выбивалось из ряда. */}
                <p className="project-hero__pay-label">{copy.paymentFrom}</p>
                <strong className="project-hero__pay">
                  {payment ? `${formatRub(payment)}${copy.perMonth}` : project.priceLabel}
                </strong>
              </div>
            </div>
          </div>
        </section>


        <ProjectExteriors project={project} />
        <ProjectPlans project={project} />
        <ProjectInteriors project={project} />
        <ProjectBuilt project={project} />
        {standardPrice ? (
          <MortgageCalculator
            key={project.id}
            projects={[]}
            initialPropertyPrice={standardPrice}
            initialProgramId="family"
            showMatches={false}
            projectTiers={tiers ?? undefined}
            showEyebrow={false}
          />
        ) : null}
        <ProjectConfig
          project={project}
          basePayment={payment}
          basePrice={basePrice}
        />
        <ProjectNextSteps />
        <ProjectSimilar projects={similarProjects} />
        <ContactsSection
          block={{
            blockType: 'contactsSection',
            showEyebrow: false,
            muted: false,
          }}
          contacts={SITE.contacts}
          siteId={SITE.id}
          pageId={project.id}
        />
      </main>
    </SiteChrome>
  )
}

function similarityScore(project: CatalogProject, candidate: CatalogProject) {
  return (
    (candidate.series === project.series ? 0 : 1_000) +
    (candidate.technology === project.technology ? 0 : 250) +
    Math.abs(candidate.areaValue - project.areaValue) * 2 +
    Math.abs(candidate.floorsValue - project.floorsValue) * 80 +
    Math.abs(Number(candidate.bedrooms) - Number(project.bedrooms)) * 40
  )
}
