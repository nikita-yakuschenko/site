'use client'

import Link from 'next/link'
import { SiteChrome } from '../components/site-chrome'
import { SITE } from '../lib/site'
import { footerAboutFor } from '../lib/copy'

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email}
    address={SITE.contacts.address} navigation={[...SITE.navigation]} overlay={false}
    footer={SITE.footer.legal} about={footerAboutFor(SITE.name)}>
    <main><section className="section"><div className="section__inner">
      <h1>Не удалось загрузить страницу</h1>
      <p>Данные временно недоступны. Попробуйте ещё раз через несколько секунд.</p>
      <button type="button" className="btn btn-yellow" onClick={retry}>Попробовать снова</button>{' '}
      <Link className="btn btn-outline-dark" href="/">На главную</Link>
    </div></section></main>
  </SiteChrome>
}
