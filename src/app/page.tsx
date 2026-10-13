import { BlockRenderer } from '../components/block-renderer'
import { SiteChrome } from '../components/site-chrome'
import { CmsCatalogProvider } from '../lib/catalog/cms-provider'
import { footerAboutFor } from '../lib/copy'
import { HOME_LAYOUT } from '../lib/home-layout'
import { SITE } from '../lib/site'

export default async function HomePage() {
  const catalog = new CmsCatalogProvider()
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
          blocks={HOME_LAYOUT.filter((block) => block.blockType !== 'advantagesBar')}
          projects={items}
          contacts={SITE.contacts}
          siteId={SITE.id}
        />
      </main>
    </SiteChrome>
  )
}
