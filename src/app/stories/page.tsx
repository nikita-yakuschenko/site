import type { Metadata } from 'next'
import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import { ContactsSection } from '../../components/block-renderer'
import { SiteChrome } from '../../components/site-chrome'
import { StoriesContent } from '../../components/stories-page'
import { YandexRating } from '../../components/yandex-rating'
import styles from '../../components/stories-page.module.css'
import { HOME_LAYOUT } from '../../lib/home-layout'
import { SITE } from '../../lib/site'
import { footerAboutFor } from '../../lib/copy'
import { listStories } from '../../lib/stories'

export const metadata: Metadata = { title: 'Отзывы о нас и о домах', description: 'Видеоистории владельцев домов Авангард Строй: опыт жизни, выбор проекта и реализованные объекты для бизнеса.', alternates: { canonical: '/stories' } }

export default async function StoriesPage() {
  const stories = await listStories()
  return <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email} address={SITE.contacts.address} navigation={[...SITE.navigation]} footer={SITE.footer.legal} about={footerAboutFor(SITE.name)} subrow={<><nav className="project-hero__crumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><IconChevronRight size={14} aria-hidden="true" /><span aria-current="page">Отзывы</span></nav><aside className={styles.headerRating}><YandexRating /></aside></>}>
    <main>
      <StoriesContent stories={stories} />
      <ContactsSection
        data-cms-content-connected
        block={{ ...HOME_LAYOUT.find(block => block.blockType === 'contactsSection')! }}
        form={HOME_LAYOUT.find(block => block.blockType === 'leadForm')}
        contacts={SITE.contacts}
        siteId={SITE.id}
        pageId="stories"
      />
    </main>
  </SiteChrome>
}
