import type { Metadata } from 'next'
import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { SiteChrome } from '../components/site-chrome'
import { ProjectCard } from '../components/project-card'
import { CmsCatalogProvider } from '../lib/catalog/cms-provider'
import { applyPopularProjects } from '../lib/popular-content'
import { copy, footerAboutFor } from '../lib/copy'
import { SITE } from '../lib/site'
import './not-found.css'
import { isCMSUnavailable } from '../server/cms-request'
import { unstable_rethrow } from 'next/navigation'

export const metadata: Metadata = {
  title: copy.notFound,
}

/** Первый экран возвращает посетителя в каталог; проекты берём из блока главной. */
export default async function NotFound() {
  const { projects } = await applyPopularProjects([], new CmsCatalogProvider(), SITE.code).catch(error => {
    unstable_rethrow(error)
    if (!isCMSUnavailable(error)) throw error
    return { projects: [] }
  })
  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={false}
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
    >
      <main className="not-found-page">
        <section className="section not-found-screen" aria-labelledby="not-found-title">
          <div className="section__inner not-found-screen__inner">
            <div className="not-found-hero">
              <div className="not-found-copy">
                <h1 id="not-found-title">Страница<br />не найдена</h1>
                <p>Возможно, адрес набран с ошибкой или страница переехала. Посмотрите проекты домов или вернитесь на главную.</p>
                <div className="not-found-actions">
                  <Link className="btn btn-yellow" href="/catalog">{copy.catalogProjects}<IconArrowUpRight size={18} stroke={2} aria-hidden="true" /></Link>
                  <Link className="btn btn-outline-dark" href="/">{copy.notFoundHome}</Link>
                </div>
                <nav className="not-found-links" aria-label="Возможно, вы искали">
                  <p>Возможно, вы искали:</p>
                  <div>
                    {[
                      ['Готовые дома', '/catalog?status=ready'],
                      ['Модульные дома', '/catalog?tech=modular'],
                      ['Панельно-каркасные дома', '/catalog?tech=panel'],
                      ['Ипотека', '/mortgage'],
                    ].map(([label, href]) => <Link key={href} href={href!}>{label}<IconArrowUpRight size={14} stroke={2} aria-hidden="true" /></Link>)}
                  </div>
                </nav>
              </div>
              <img className="not-found-art" src="/img/404.png" alt="" width={1774} height={887} loading="lazy" decoding="async" />
            </div>
            {projects.length > 0 ? <section className="not-found-popular" aria-labelledby="not-found-popular-title">
              <div className="not-found-popular__head">
                <h2 id="not-found-popular-title">{copy.popularHeading}</h2>
                <Link className="btn btn-yellow" href="/catalog">Все проекты<IconArrowUpRight size={18} stroke={2} aria-hidden="true" /></Link>
              </div>
              <div className="grid-3">
                {projects.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} />)}
              </div>
            </section> : null}
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
