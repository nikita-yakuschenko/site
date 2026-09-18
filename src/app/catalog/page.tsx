import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { CatalogBoard, type BoardItem } from '../../components/catalog-board'
import { ProjectCard } from '../../components/project-card'
import { SiteChrome } from '../../components/site-chrome'
import { CATALOG_PROJECTS } from '../../lib/catalog/projects'
import { FixtureCatalogProvider } from '../../lib/catalog/fixture-provider'
import {
  canonicalRedirect,
  facetsOf,
  isEmpty,
  parseFilters,
} from '../../lib/catalog/filters'
import { copy, footerAboutFor, seriesTitle } from '../../lib/copy'
import { SITE } from '../../lib/site'

const catalog = new FixtureCatalogProvider()
const facets = facetsOf(CATALOG_PROJECTS)

type Search = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams)
  const title = filters.series ? seriesTitle(filters.series) : copy.catalogTitle
  return {
    title,
    description: copy.catalogLead,
    /* Отобранная выдача это тот же каталог под другим углом, а не
       самостоятельная страница. Без canonical поиск индексирует каждую
       комбинацию условий как отдельный документ, и они начинают
       конкурировать между собой. */
    alternates: { canonical: '/catalog' },
    robots: isEmpty(filters) ? undefined : { index: false, follow: true },
  }
}

/**
 * Список проектов.
 *
 * Условия отбора приходят из адресной строки по схеме, описанной в
 * lib/catalog/filters.ts. Негодные и посторонние параметры не ошибка:
 * страница отвечает редиректом на очищенный адрес.
 *
 * Карточки рендерятся здесь, на сервере, и уходят в CatalogBoard готовыми:
 * раскладкой и избранным занимается он, но сам ProjectCard остаётся
 * серверным.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams
  const filters = parseFilters(params)

  const canonical = canonicalRedirect(params, filters)
  if (canonical) permanentRedirect(canonical)

  const { items, rest } = await catalog.list({ siteCode: SITE.code, filters })
  const toBoard = (list: typeof items): BoardItem[] =>
    list.map((project) => ({ id: project.id, card: <ProjectCard project={project} /> }))

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
        <section className="section catalog-section">
          <div className="section__inner">
            {/* Заголовок без картинки: человеку и так видно, куда он попал,
                а поиску и скринридеру страница без h1 не годится. */}
            <h1 className="visually-hidden">{copy.catalogTitle}</h1>

            <CatalogBoard
              filters={filters}
              facets={facets}
              matched={toBoard(items)}
              rest={toBoard(rest)}
              picked={!isEmpty(filters)}
            />
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
