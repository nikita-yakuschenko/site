import type { Metadata } from 'next'
import { ProjectCard } from '../../components/project-card'
import { SiteChrome } from '../../components/site-chrome'
import { FixtureCatalogProvider } from '../../lib/catalog/fixture-provider'
import { copy, footerAboutFor } from '../../lib/copy'
import { SITE } from '../../lib/site'

export const metadata: Metadata = {
  title: copy.catalogTitle,
  description: copy.catalogLead,
}

/**
 * Список проектов.
 *
 * Источник — тот же провайдер, что у блока «Популярные» на главной, поэтому
 * подмена фикстур на Payload в AV4-10 не потребует правок здесь. Фильтров
 * пока нет: провайдер умеет отбирать по этажности и площади, но сначала
 * нужен выверенный макет каталога (AV4-15).
 */
export default async function CatalogPage() {
  const catalog = new FixtureCatalogProvider()
  const { items } = await catalog.list({ siteCode: SITE.code })

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
      <main>
        <section className="section">
          <div className="section__inner">
            <p className="eyebrow">{copy.catalog}</p>
            <h1>{copy.catalogTitle}</h1>
            <p className="info-page__lead">{copy.catalogLead}</p>
            <p className="catalog__count">
              {items.length} {copy.catalogCount}
            </p>
            {items.length ? (
              <div className="grid-3">
                {items.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <p className="catalog__empty">{copy.catalogEmpty}</p>
            )}
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
