import { CMSStaticBlock } from '../../components/cms-static-content'
import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { CatalogBoard, type BoardItem } from '../../components/catalog-board'
import { ProjectCard } from '../../components/project-card'
import { SiteChrome } from '../../components/site-chrome'
import { CmsCatalogProvider } from '../../lib/catalog/cms-provider'
import {
  canonicalRedirect,
  facetsOf,
  isEmpty,
  parseFilters,
} from '../../lib/catalog/filters'
import { copy, footerAboutFor } from '../../lib/copy'
import { SITE } from '../../lib/site'

const catalog = new CmsCatalogProvider()


type Search = Promise<Record<string, string | string[] | undefined>>

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    const current = result[index]!
    result[index] = result[other]!
    result[other] = current
  }
  return result
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search
}): Promise<Metadata> {
  const filters = parseFilters(await searchParams)
  return {
    title: copy.catalogProjects,
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
  const all = await catalog.list({ siteCode: SITE.code })
  const facets = facetsOf(all.items)
  const params = await searchParams
  const filters = parseFilters(params)

  const filterParams = Object.fromEntries(Object.entries(params).filter(([key]) => key !== 'cmsPreview' && key !== 'cmsIndex'))
  const canonical = canonicalRedirect(filterParams, filters)
  if (canonical) {
    const target = new URL(canonical, 'http://localhost')
    for (const key of ['cmsPreview', 'cmsIndex']) if (typeof params[key] === 'string') target.searchParams.set(key, params[key])
    permanentRedirect(`${target.pathname}${target.search}`)
  }

  const { items, rest } = await catalog.list({ siteCode: SITE.code, filters })
  const heading = copy.catalogProjects
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
        <CMSStaticBlock cmsBlockKey="PagecatalogSection0" scope={"/catalog"}><section className="section catalog-section">
          <div className="section__inner">
            {/* Заголовок без картинки: человеку и так видно, куда он попал,
                а поиску и скринридеру страница без h1 не годится. */}
            <h1 className="visually-hidden">{heading}</h1>

            <CatalogBoard
              filters={filters}
              facets={facets}
              matched={toBoard(shuffled(items))}
              rest={filters.status === 'ready' ? [] : toBoard(rest)}
              picked={!isEmpty(filters)}
            />
          </div>
        </section></CMSStaticBlock>
      </main>
    </SiteChrome>
  )
}
