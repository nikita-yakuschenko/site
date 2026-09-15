import type { Metadata } from 'next'
import Link from 'next/link'
import { ProjectCard } from '../../components/project-card'
import { SiteChrome } from '../../components/site-chrome'
import { FixtureCatalogProvider } from '../../lib/catalog/fixture-provider'
import { CATALOG_SERIES, isCatalogSeries } from '../../lib/catalog/types'
import { copy, footerAboutFor, projectsInSeries, seriesTitle } from '../../lib/copy'
import { SITE } from '../../lib/site'

const catalog = new FixtureCatalogProvider()

function seriesFrom(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && isCatalogSeries(raw) ? raw : undefined
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ series?: string | string[] }>
}): Promise<Metadata> {
  const series = seriesFrom((await searchParams).series)
  if (!series) return { title: copy.catalogTitle, description: copy.catalogLead }
  const title = seriesTitle(series)
  return { title, description: copy.catalogLead }
}

/**
 * Список проектов.
 *
 * Серия приходит из адресной строки — те же ссылки, что стоят на плитках
 * главной. Источник тот же, что у блока «Популярные», поэтому подмена
 * фикстур на Payload в AV4-10 не потребует правок разметки.
 */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ series?: string | string[] }>
}) {
  const series = seriesFrom((await searchParams).series)
  const { items } = await catalog.list({ siteCode: SITE.code, series })
  const title = series ? seriesTitle(series) : copy.catalogTitle

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
            <h1>{title}</h1>
            <p className="info-page__lead">{copy.catalogLead}</p>
            <nav className="catalog-filters" aria-label={copy.catalogSeriesAria}>
              <Link
                className={`btn ${series ? 'btn-outline-dark' : 'btn-primary'}`}
                href="/catalog"
                aria-current={series ? undefined : 'page'}
              >
                {copy.catalogAllSeries}
              </Link>
              {CATALOG_SERIES.map((id) => (
                <Link
                  key={id}
                  className={`btn ${series === id ? 'btn-primary' : 'btn-outline-dark'}`}
                  href={`/catalog?series=${id}`}
                  aria-current={series === id ? 'page' : undefined}
                >
                  {seriesTitle(id)}
                </Link>
              ))}
            </nav>
            <p className="catalog__count">{projectsInSeries(items.length)}</p>
            {items.length ? (
              <div className="grid-3">
                {items.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <p className="catalog__empty">
                {copy.catalogEmpty}{' '}
                <Link href="/catalog">{copy.allProjects}</Link>
              </p>
            )}
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
