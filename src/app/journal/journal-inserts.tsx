import Image from 'next/image'
import { unstable_rethrow } from 'next/navigation'
import { ProjectCard } from '@/components/project-card'
import { CmsCatalogProvider } from '@/lib/catalog/cms-provider'
import type { CatalogProject } from '@/lib/catalog/types'
import { SITE } from '@/lib/site'
import { isCMSUnavailable } from '@/server/cms-request'
import desktopBanner from '../../../public/promo/banner_ipoteka.png'
import mobileBanner from '../../../public/promo/mobile_banner_ipoteka.png'
import type { Story } from './content'

const siteOrigin = 'https://avgst.ru'
const catalog = new CmsCatalogProvider()

const nordicProject = /сканди|норвеги|шведск|финлянди|финск|scand|norway|swed|finland/i
const themes: { editorial: RegExp; project: (project: CatalogProject) => boolean }[] = [
  { editorial: /барнхаус|barn[ -]?house/i, project: project => project.series === 'barn' },
  { editorial: /[аa][\s‑–-]?фрейм|a[ -]?frame|дом[ -]шалаш/i, project: project => project.series === 'aframe' },
  { editorial: nordicProject, project: project => nordicProject.test(`${project.name} ${project.slug}`) },
  { editorial: /модул(?:ь|е)|modular/i, project: project => project.technology === 'modular' },
]

function selectProjects(story: Story, available: CatalogProject[]) {
  const text = [story.title, story.description, story.tags.join(' ')]
  const match = text.flatMap(part => themes.filter(theme => theme.editorial.test(part)))[0]
  const projects = available.filter(project => !project.readyHome && project.imageUrl && project.href.startsWith('/catalog/'))
  const relevant = match ? projects.filter(match.project) : []
  if (relevant.length) return relevant.slice(0, 4)
  // A general article can show different series from the published catalog.
  return projects.filter((project, index) => projects.findIndex(item => item.series === project.series) === index).slice(0, 4)
}

export function JournalMortgageBanner() {
  return <a className="journal-mortgage-banner" href={`${siteOrigin}/family-mortgage`}>
    <picture>
      <source media="(max-width: 599px)" srcSet={mobileBanner.src} width={mobileBanner.width} height={mobileBanner.height} />
      <Image src={desktopBanner} alt="Авангард Строй и Сбер. Семейная ипотека на строительство дома под 3,9% на срок до 30 лет. Получите одобрение до 11 декабря." unoptimized />
    </picture>
  </a>
}

function catalogPhotoUrl(src: string) {
  const url = new URL(src, siteOrigin)
  if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.startsWith('/api/media/file/')) {
    return new URL(url.pathname + url.search, 'https://cms.avgst.ru').href
  }
  return url.href
}

export async function JournalProjectRecommendations({ story }: { story: Story }) {
  const { items } = await catalog.list({ siteCode: SITE.code }).catch((error: unknown) => {
    unstable_rethrow(error)
    if (!isCMSUnavailable(error)) throw error
    return { items: [] }
  })
  const projects = selectProjects(story, items)
  if (!projects.length) return null

  return <section className="journal-project-recommendations" aria-labelledby="journal-project-recommendations-title">
    <div className="journal-project-recommendations__heading">
      <h2 id="journal-project-recommendations-title">Проекты домов</h2>
      <a className="btn btn-yellow" href={`${siteOrigin}/catalog`}>Все проекты</a>
    </div>
    <div className="journal-project-recommendations__grid">
      {projects.map(project => <ProjectCard key={project.id} project={{ ...project, href: new URL(project.href, siteOrigin).href, imageUrl: catalogPhotoUrl(project.imageUrl) }} showPrice={false} />)}
    </div>
  </section>
}
