import { LeadDialogButton } from './lead-dialog'
import { SiteChrome } from './site-chrome'
import { copy, footerAboutFor } from '../lib/copy'
import { SITE } from '../lib/site'

/**
 * Каркас информационной страницы: надзаголовок, заголовок, лид,
 * необязательный список и кнопка заявки.
 *
 * Пока это заглушки под ссылки служебной шапки — содержимое наполняется в
 * AV4-15, а разметка страниц уедет в блоки CMS вместе с AV4-14. Цифр,
 * ставок и сроков здесь нет намеренно: их значения нужно подтверждать у
 * заказчика, а выдуманные — прямой вред.
 */
export function InfoPage({
  eyebrow,
  title,
  lead,
  items,
  cta = copy.consult,
}: {
  eyebrow: string
  title: string
  lead: string
  items?: readonly string[]
  cta?: string
}) {
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
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="info-page__lead">{lead}</p>
            {items?.length ? (
              <ul className="info-page__list">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {/* Форма открывается здесь же. Прежде кнопка вела якорем на
                «/#contacts» — то есть уносила человека с этой страницы на
                главную, в подвал, ради трёх полей. */}
            <LeadDialogButton
              className="btn btn-yellow info-page__cta"
              label={cta}
              heading={cta}
              pageId={eyebrow}
            />
          </div>
        </section>
      </main>
    </SiteChrome>
  )
}
