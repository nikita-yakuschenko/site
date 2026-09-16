import { BlockRenderer } from '../components/block-renderer'
import { SiteChrome } from '../components/site-chrome'
import { FixtureCatalogProvider } from '../lib/catalog/fixture-provider'
import { footerAboutFor } from '../lib/copy'
import { HOME_LAYOUT } from '../lib/home-layout'
import { SITE } from '../lib/site'

export default async function HomePage() {
  // Каталог берётся из фикстур — тех же, что используются на main, когда база
  // недоступна. Провайдер меняется на payload-provider в AV4-10.
  const catalog = new FixtureCatalogProvider()
  // На главной в «Популярных» только 6 проектов, не весь каталог.
  const { items } = await catalog.list({ siteCode: SITE.code, limit: 6 })

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
          blocks={HOME_LAYOUT}
          projects={items}
          contacts={SITE.contacts}
          siteId={SITE.id}
        />
      </main>
    </SiteChrome>
  )
}
