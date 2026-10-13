import { resolveProjectPlans } from '../../../lib/catalog/project-plans'
import { resolveProjectConfigurations } from '../../../lib/catalog/project-configurations'
import { ProjectHeroPayment } from '../../../components/project-hero-payment'
import { ProjectSectionTones } from '../../../components/project-section-tones'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { IconChevronRight } from '@tabler/icons-react'
import {
  ProjectExteriors,
  ProjectInteriors,
} from '../../../components/project-media'
import { ProjectPlans } from '../../../components/project-plans'
import { ProjectBuilt } from '../../../components/project-built'
import { ProjectConfig } from '../../../components/project-config'
import { ProjectNextSteps } from '../../../components/project-next-steps'
import { ProjectSimilar } from '../../../components/project-similar'
import { ReadyHomeOffer } from '../../../components/ready-home-offer'
import { ContactsSection } from '../../../components/block-renderer'
import { MortgageCalculator } from '../../../components/mortgage-calculator'
import { ProjectActions } from '../../../components/project-actions'
import { SiteChrome } from '../../../components/site-chrome'
import { ProjectLeadProvider } from '../../../components/project-lead-context'
import { CmsCatalogProvider } from '../../../lib/catalog/cms-provider'
import type { CatalogProject } from '../../../lib/catalog/types'
import { copy, footerAboutFor } from '../../../lib/copy'
import { formatRub } from '../../../lib/locale'
import { resolveProjectHero } from '../../../lib/catalog/project-hero'
import { resolveProjectExteriors, resolveProjectInteriors } from '../../../lib/catalog/project-exteriors'
import { resolveProjectBuilt } from '../../../lib/catalog/project-built'
import { resolveProjectNextSteps } from '../../../lib/catalog/project-next-steps'
import { ProjectHeroContent } from '../../../components/project-hero-content'
import { SITE } from '../../../lib/site'
import { getProjectPageOrder } from '../../../lib/catalog/page-order'

const catalog = new CmsCatalogProvider()

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const result = await resolveProjectHero(slug)
  if (!result) return { title: copy.notFound }
  return { title: result.hero.name, description: result.project.description }
}

/** Карточка проекта из CMS с общими и системными блоками. */
export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cmsPreview?: string }> }) {
  const { slug } = await params
  const result = await resolveProjectHero(slug)
  if (!result) notFound()
  const { project, hero, source } = result
  if (hero.slug !== slug) {
    const query = await searchParams
    redirect(`/catalog/${hero.slug}${query.cmsPreview === '1' ? '?cmsPreview=1' : ''}`)
  }
  const heroProject = { ...project, name: hero.name, slug: hero.slug }
  const [exteriors, interiors, built, nextSteps, plans, configurations] = await Promise.all([resolveProjectExteriors(hero.slug), resolveProjectInteriors(hero.slug), resolveProjectBuilt(hero.slug), resolveProjectNextSteps(hero.slug), resolveProjectPlans(hero.slug), resolveProjectConfigurations(hero.slug)])

  const pageOrder = await getProjectPageOrder(slug)
  const blockStyle = (key: string) => ({ order: pageOrder.indexOf(key), width: '100%' })

  const { items: catalogProjects } = await catalog.list({ siteCode: SITE.code })
  const similarProjects = catalogProjects
    .filter((item) => item.id !== project.id)
    .sort((a, b) => similarityScore(project, a) - similarityScore(project, b))
    .slice(0, 6)

  const readyHome = project.readyHome

  const tiers = readyHome ? null : configurations ?? []
  const standardPrice = tiers?.find(tier => tier.id === 'standard')?.price ?? null


  return (
    <ProjectLeadProvider project={project}>
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
            <span aria-current="page">{hero.name}</span>
          </nav>
          <ProjectActions project={heroProject} stats={{ likes: 0, shares: 0 }} />
        </>
      }
    >
      <main data-project-sections style={{ display: 'flex', flexDirection: 'column' }}>
        <ProjectSectionTones />
        <section className="project-hero" data-cms-block="projectHero" data-content-source={source} style={{ order: -1 }}>
          <ProjectHeroContent data={hero} connected={source === 'database'} location={readyHome?.locationPrepositional ?? readyHome?.location} payment={tiers ? <ProjectHeroPayment tiers={tiers} /> :
              <div key="payment" className="project-hero__aside">
                {/* Подпись над суммой, как у характеристик слева: без неё
                    число висело само по себе и выбивалось из ряда. */}
                <p className="project-hero__pay-label">
                  {readyHome ? 'Цена' : copy.paymentFrom}
                </p>
                <strong className="project-hero__pay">
                  {readyHome
                    ? formatRub(readyHome.salePrice)
                    : 'Стоимость уточняется'}
                </strong>
              </div>
          } />
        </section>


        {pageOrder.map(key => {
          const blocks: Record<string, React.ReactNode> = {
            ProjectExteriors: <ProjectExteriors project={project} images={exteriors ?? undefined} connected={exteriors !== null} />,
            ProjectPlans: <ProjectPlans project={project} variants={plans ?? undefined} connected={plans !== null} />,
            ProjectInteriors: <ProjectInteriors project={project} images={interiors ?? undefined} connected={interiors !== null} />,
            ProjectBuilt: <ProjectBuilt project={project} items={built ?? undefined} />,
            ReadyHomeOffer: readyHome ? <ReadyHomeOffer project={project} /> : null,
            MortgageCalculator: !readyHome && tiers ? <MortgageCalculator projects={[]} initialPropertyPrice={standardPrice || undefined} initialProgramId="family" showMatches={false} projectTiers={tiers} showEyebrow={false} /> : null,
            ProjectConfig: !readyHome ? <ProjectConfig project={heroProject} configurations={configurations ?? []} /> : null,
            ProjectNextSteps: <ProjectNextSteps readyHome={Boolean(readyHome)} reviewImage={project.imageUrl} visitImage={readyHome?.visitImage} settings={nextSteps} />,
            ProjectSimilar: <ProjectSimilar projects={similarProjects} />,
            contactsSection: <ContactsSection block={{ blockType: 'contactsSection', showEyebrow: false, muted: false }} contacts={SITE.contacts} siteId={SITE.id} pageId={project.id} project={{ id: project.id, cmsId: hero.projectId, slug: hero.slug, name: hero.name }} />,
          }
          return blocks[key] ? <div key={key} data-cms-block={key} style={blockStyle(key)}>{blocks[key]}</div> : null
        })}
      </main>
    </SiteChrome>
    </ProjectLeadProvider>
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
