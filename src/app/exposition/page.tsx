import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import heroImage from '../../../public/img/pages/exposition-hero.png'
import { ExpositionShell, ExpositionPhotoPlaceholder } from '../../components/exposition-shell'
import { LeadDialogButton } from '../../components/lead-dialog'
import { EXPOSITION_PLACES } from '../../lib/exposition'

export const metadata: Metadata = {
  title: 'Выставочные площадки',
  description: 'Выставочные площадки в КП «Авангард» и КП «Высокий Квартал». Запись на экскурсию.',
}

export default function ExpositionPage() {
  return (
    <ExpositionShell>
      <section className="section manufacture-intro exposition-hero" aria-labelledby="exposition-title">
        <div className="section__inner">
          <div className="manufacture-intro__banner">
            <Image src={heroImage} alt="Вид коттеджного посёлка с высоты" fill preload sizes="(max-width: 1199px) 100vw, 1152px" />
            <div className="manufacture-intro__copy">
              <h1 id="exposition-title">Запишитесь на экскурсию на выставочные площадки</h1>
              <p>КП «Авангард» и КП «Высокий Квартал».</p>
              <LeadDialogButton label="Записаться на экскурсию" heading="Записаться на экскурсию"
                body="Оставьте контакты, мы свяжемся с вами и согласуем удобное время."
                submitLabel="Записаться на экскурсию" pageId="exposition"
                meta={{ requestType: 'exposition-tour' }} />
            </div>
          </div>
        </div>
      </section>
      {EXPOSITION_PLACES.map((place, index) => (
        <section key={place.slug}
          className={`section exposition-place${index === 0 ? ' section--muted' : ' exposition-place--reverse'}`}
          aria-labelledby={`place-${place.slug}`}>
          <div className="section__inner exposition-place__layout">
            <ExpositionPhotoPlaceholder />
            <div className="exposition-place__copy">
              <h2 id={`place-${place.slug}`}>{place.name}</h2>
              <address>{place.address}</address>
              <div className="production__copy">
              <div className="production__actions">
                <LeadDialogButton label="Записаться на экскурсию" heading={`Экскурсия в ${place.name}`}
                  submitLabel="Записаться на экскурсию" pageId="exposition"
                  meta={{ requestType: 'exposition-tour', exposition: place.slug }} />
                <Link className="btn btn-outline-dark" href={`/exposition/${place.slug}`} aria-label={`Подробнее о ${place.name}`}>
                  Подробнее
                </Link>
              </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </ExpositionShell>
  )
}
