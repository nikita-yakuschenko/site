import type { Metadata } from 'next'
import Link from 'next/link'
import { ProjectCard } from '../../components/project-card'
import { SiteChrome } from '../../components/site-chrome'
import { FixtureCatalogProvider } from '../../lib/catalog/fixture-provider'
import { CATALOG_SERIES, isCatalogSeries } from '../../lib/catalog/types'
import { formatRub } from '../../lib/locale'
import { copy, footerAboutFor, projectsInSeries, seriesTitle } from '../../lib/copy'
import { SITE } from '../../lib/site'

const catalog = new FixtureCatalogProvider()

function seriesFrom(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && isCatalogSeries(raw) ? raw : undefined
}

function maxPriceFrom(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

function catalogHref(parts: { series?: string; maxPrice?: number }) {
  const q = new URLSearchParams()
  if (parts.series) q.set('series', parts.series)
  if (parts.maxPrice != null) q.set('maxPrice', String(parts.maxPrice))
  const s = q.toString()
  return s ? `/catalog?${s}` : '/catalog'
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ series?: string | string[]; maxPrice?: string | string[] }>
}): Promise<Metadata> {
  const params = await searchParams
  const series = seriesFrom(params.series)
  if (!series) return { title: copy.catalogTitle, description: copy.catalogLead }
  const title = seriesTitle(series)
  return { title, description: copy.catalogLead }
}

/**
 * Список проектов.
 *
 * Серия и maxPrice приходят из адресной строки (калькулятор ипотеки
 * открывает каталог с потолком бюджета).
 */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ series?: string | string[]; maxPrice?: string | string[] }>
}) {
  const params = await searchParams
  const series = seriesFrom(params.series)
  const maxPrice = maxPriceFrom(params.maxPrice)
  const { items } = await catalog.list({
    siteCode: SITE.code,
    series,
    maxPrice,
  })
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
            {maxPrice != null ? (
              <p className="catalog__budget-note">
                {copy.catalogMaxPriceNote} {formatRub(maxPrice)}
                {' · '}
                <Link href={catalogHref({ series })}>{copy.catalogClearMaxPrice}</Link>
              </p>
            ) : null}
            <nav className="catalog-filters" aria-label={copy.catalogSeriesAria}>
              <Link
                className={`btn ${series ? 'btn-outline-dark' : 'btn-primary'}`}
                href={catalogHref({ maxPrice })}
                aria-current={series ? undefined : 'page'}
              >
                {copy.catalogAllSeries}
              </Link>
              {CATALOG_SERIES.map((id) => (
                <Link
                  key={id}
                  className={`btn ${series === id ? 'btn-primary' : 'btn-outline-dark'}`}
                  href={catalogHref({ series: id, maxPrice })}
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
