import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteChrome } from '../components/site-chrome'
import { copy, footerAboutFor } from '../lib/copy'
import { SITE } from '../lib/site'

export const metadata: Metadata = {
  title: copy.notFound,
}

/**
 * Своя страница 404.
 *
 * Без неё Next показывает встроенную: английский текст и чёрный фон, если
 * у посетителя тёмная тема системы. Шапка и подвал здесь важнее текста —
 * с несуществующего адреса человек должен уйти в навигацию, а не назад.
 */
export default function NotFound() {
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
            <p className="eyebrow">404</p>
            <h1>{copy.notFound}</h1>
            <p className="info-page__lead">{copy.notFoundLead}</p>
            <div className="info-page__actions">
              <Link className="btn btn-yellow" href="/catalog">
                {copy.catalogProjects}
              </Link>
              <Link className="btn btn-outline-dark" href="/">
                {copy.notFoundHome}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
