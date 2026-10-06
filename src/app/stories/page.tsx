import type { Metadata } from 'next'
import { SiteChrome } from '../../components/site-chrome'
import { VideoTestimonials } from '../../components/video-testimonials'
import { SITE } from '../../lib/site'
import { footerAboutFor } from '../../lib/copy'

export const metadata: Metadata = { title: 'Дома и истории — Авангард Строй', description: 'Построенные дома и истории их владельцев.' }

export default function StoriesPage() {
  return <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email} address={SITE.contacts.address} navigation={[...SITE.navigation]} footer={SITE.footer.legal} about={footerAboutFor(SITE.name)}>
    <main><section className="section"><div className="section__inner"><h1>Дома и истории</h1></div></section><VideoTestimonials showEyebrow={false} showAllLink={false} /></main>
  </SiteChrome>
}
