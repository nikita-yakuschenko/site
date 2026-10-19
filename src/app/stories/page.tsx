import type { Metadata } from 'next'
import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import { ContactsSection } from '../../components/block-renderer'
import { SiteChrome } from '../../components/site-chrome'
import { StoriesContent, type StoryProject } from '../../components/stories-page'
import { YandexRating } from '../../components/yandex-rating'
import styles from '../../components/stories-page.module.css'
import { CmsCatalogProvider } from '../../lib/catalog/cms-provider'
import { HOME_LAYOUT } from '../../lib/home-layout'
import { SITE } from '../../lib/site'
import { copy, footerAboutFor } from '../../lib/copy'

export const metadata: Metadata = { title: 'Отзывы о нас и о домах', description: 'Видеоистории владельцев домов Авангард Строй: опыт жизни, выбор проекта и реализованные объекты для бизнеса.', alternates: { canonical: '/stories' } }

export default async function StoriesPage() {
  const { items } = await new CmsCatalogProvider().list({ siteCode: SITE.code })
  const projects: Record<string, StoryProject> = {}
  for (const story of copy.videoTestimonials.stories) {
    const project = items.find(item => item.name.toLowerCase() === story.title.toLowerCase())
    if (project) projects[story.title] = { href: project.href, image: project.imageUrl, label: 'Посмотреть проект' }
  }
  return <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email} address={SITE.contacts.address} navigation={[...SITE.navigation]} footer={SITE.footer.legal} about={footerAboutFor(SITE.name)} subrow={<><nav className="project-hero__crumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><IconChevronRight size={14} aria-hidden="true" /><span aria-current="page">Отзывы</span></nav><aside className={styles.headerRating}><YandexRating /></aside></>}>
    <main>
      <StoriesContent projects={projects} />
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
