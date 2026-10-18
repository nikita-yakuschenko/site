import { resolveProjectPlans } from '../../../lib/catalog/project-plans'
import { resolveProjectConfigurations } from '../../../lib/catalog/project-configurations'
import { ProjectHeroPayment } from '../../../components/project-hero-payment'
import { ProjectSectionTones } from '../../../components/project-section-tones'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { readProjectReactions, VOTER_COOKIE } from '../../../lib/reactions'
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
import type { ProjectHeroData } from '../../../lib/catalog/project-hero-data'
import { DraftPreviewGate } from '../../../components/draft-preview-gate'
import { SITE } from '../../../lib/site'
import { getProjectPageOrder } from '../../../lib/catalog/page-order'

const catalog = new CmsCatalogProvider()

const DRAFT_SLUG = '__draft'
const draftHero: ProjectHeroData = { slug: '', name: 'Без названия', technologyBadge: '', areaValue: 0, floorsValue: 0, bedrooms: 0, bathrooms: 0, imageUrl: '', mobileImageUrl: null }
const draftProject = {
  project: { id: DRAFT_SLUG, slug: DRAFT_SLUG, name: 'Без названия', area: '', areaValue: 0, floors: '', floorsValue: 0, bedrooms: '0', bathrooms: '0', priceLabel: 'Цена уточняется', priceAmount: null, imageUrl: '', technologyBadge: '', technology: 'panel', series: 'panel', href: '#', description: '', about: [], exteriors: [], interiors: [], floorPlans: [], options: [] } as CatalogProject,
  hero: draftHero,
  source: 'database' as const,
}
// Headings shown for sections that have no content yet
const draftHeadings: Record<string, string> = {
  ProjectExteriors: copy.exteriorsHeading,
  ProjectPlans: copy.plansHeading,
  ProjectInteriors: copy.interiorsHeading,
  ProjectBuilt: 'Как дом выглядит в жизни',
  MortgageCalculator: 'Расчёт ипотеки',
  ProjectConfig: copy.configHeading,
  ProjectSimilar: 'Похожие проекты',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  if (slug === DRAFT_SLUG) return { title: 'Без названия', robots: { index: false, follow: false } }
  const result = await resolveProjectHero(slug)
  if (!result) return { title: copy.notFound }
  return { title: result.hero.name, description: result.project.description }
}

/** Карточка проекта из CMS с общими и системными блоками. */
export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cmsPreview?: string }> }) {
  const { slug } = await params
  const query = await searchParams
  // CMS preview of an unpublished project: empty page filled by form drafts
  const draft = slug === DRAFT_SLUG
  if (draft && query.cmsPreview !== '1') notFound()
  const result = draft ? draftProject : await resolveProjectHero(slug)
  if (!result) notFound()
  const { project, hero, source } = result
  if (!draft && hero.slug !== slug) redirect(`/catalog/${hero.slug}${query.cmsPreview === '1' ? '?cmsPreview=1' : ''}`)
  const heroProject = { ...project, name: hero.name, slug: hero.slug }
  const voter = draft ? undefined : (await cookies()).get(VOTER_COOKIE)?.value
  const reactions = draft ? { likes: 0, shares: 0, liked: false } : await readProjectReactions(hero.slug, voter)
  const [exteriors, interiors, built, nextSteps, plans, configurations] = draft ? [[], [], [], undefined, [], []] : await Promise.all([resolveProjectExteriors(hero.slug), resolveProjectInteriors(hero.slug), resolveProjectBuilt(hero.slug), resolveProjectNextSteps(hero.slug), resolveProjectPlans(hero.slug), resolveProjectConfigurations(hero.slug)])

  const pageOrder = await getProjectPageOrder(slug)
  const blockStyle = (key: string) => ({ order: pageOrder.indexOf(key), width: '100%' })

  const { items: catalogProjects } = draft ? { items: [] } : await catalog.list({ siteCode: SITE.code })
  const similarProjects = catalogProjects
    .filter((item) => item.id !== project.id)
    .sort((a, b) => similarityScore(project, a) - similarityScore(project, b))
    .slice(0, 6)

  const readyHome = project.readyHome

  const tiers = readyHome ? null : configurations ?? []
  const standardPrice = tiers?.find(tier => tier.id === 'standard')?.price ?? null


  return (
    <ProjectLeadProvider project={project}>
    <DraftPreviewGate enabled={draft}>
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
          <ProjectActions project={heroProject} stats={reactions} liked={reactions.liked} />
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
            MortgageCalculator: !readyHome && tiers && !draft ? <MortgageCalculator projects={[]} initialPropertyPrice={standardPrice || undefined} initialProgramId="family" showMatches={false} projectTiers={tiers} showEyebrow={false} project={{ id: heroProject.id, name: heroProject.name }} /> : null,
            ProjectConfig: !readyHome ? <ProjectConfig project={heroProject} configurations={configurations ?? []} /> : null,
            ProjectNextSteps: <ProjectNextSteps readyHome={Boolean(readyHome)} reviewImage={project.imageUrl} visitImage={readyHome?.visitImage} settings={nextSteps} />,
            ProjectSimilar: <ProjectSimilar projects={similarProjects} />,
            contactsSection: <ContactsSection data-cms-content-connected block={{ blockType: 'contactsSection', showEyebrow: false, muted: false }} contacts={SITE.contacts} siteId={SITE.id} pageId={project.id} project={{ id: project.id, cmsId: hero.projectId, slug: hero.slug, name: hero.name }} />,
          }
          const emptyHeading = draft ? draftHeadings[key] : undefined
          return blocks[key] || emptyHeading ? <div key={key} data-cms-block={key} style={blockStyle(key)}>{blocks[key]}{emptyHeading && <section className="section project-preview-empty"><div className="section__inner"><h2>{emptyHeading}</h2></div></section>}</div> : null
        })}
        {/* Heading stays only while the section itself renders nothing */}
        {draft && <style>{'.project-preview-empty:not(:only-child) { display: none; }'}</style>}
      </main>
    </SiteChrome>
    </DraftPreviewGate>
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
