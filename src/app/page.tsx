import { BlockRenderer } from '../components/block-renderer'
import { SiteChrome } from '../components/site-chrome'
import { CmsCatalogProvider } from '../lib/catalog/cms-provider'
import { footerAboutFor } from '../lib/copy'
import { withHeroContent } from '../lib/hero-content'
import { applyPopularProjects } from '../lib/popular-content'
import { applySeriesBento } from '../lib/series-content'
import { HOME_LAYOUT } from '../lib/home-layout'
import { SITE } from '../lib/site'
import { listStories } from '../lib/stories'

export default async function HomePage() {
  const catalog = new CmsCatalogProvider()
  const popular = await applyPopularProjects(await withHeroContent(HOME_LAYOUT.filter((block) => block.blockType !== 'advantagesBar')), catalog, SITE.code)
  const blocks = await applySeriesBento(popular.blocks, catalog, SITE.code)
  const stories = await listStories()

  const hasHero = HOME_LAYOUT.some((block) => block.blockType === 'hero')

  return (
    <SiteChrome
      name={SITE.name}
      phone={SITE.contacts.phone}
      email={SITE.contacts.email}
      address={SITE.contacts.address}
      navigation={[...SITE.navigation]}
      overlay={hasHero}
      footer={SITE.footer.legal}
      about={footerAboutFor(SITE.name)}
    >
      <main>
        <BlockRenderer
          blocks={blocks}
          projects={popular.projects}
          stories={stories}
          contacts={SITE.contacts}
          siteId={SITE.id}
        />
      </main>
    </SiteChrome>
  )
}
