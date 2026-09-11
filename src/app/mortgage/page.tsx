import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteChrome } from '../../components/site-chrome'
import { copy, footerAboutFor } from '../../lib/copy'
import { SITE } from '../../lib/site'

export const metadata: Metadata = {
  title: copy.mortgageTitle,
  description: copy.mortgageLead,
}

/**
 * Страница-заглушка под ссылку «Ипотека» в служебном ряду.
 *
 * Ставок, сроков и сумм здесь нет намеренно: по программам нужны
 * подтверждённые заказчиком значения, а выдуманные цифры в разговоре о
 * деньгах — худшее, что можно поставить на страницу. Наполняется в AV4-15.
 */
export default function MortgagePage() {
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
            <p className="eyebrow">{copy.mortgage}</p>
            <h1>{copy.mortgageTitle}</h1>
            <p className="mortgage__lead">{copy.mortgageLead}</p>
            <ul className="mortgage__programs">
              {copy.mortgagePrograms.map((program) => (
                <li key={program}>{program}</li>
              ))}
            </ul>
            <Link className="btn btn-yellow" href="/#contacts">
              {copy.mortgageCta}
            </Link>
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
