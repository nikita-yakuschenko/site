import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExpositionShell, ExpositionPhotoPlaceholder } from '../../../components/exposition-shell'
import { LeadForm } from '../../../components/lead-form'
import { LeadDialogButton } from '../../../components/lead-dialog'
import { EXPOSITION_PLACES } from '../../../lib/exposition'
import { SITE } from '../../../lib/site'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return EXPOSITION_PLACES.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const place = EXPOSITION_PLACES.find((item) => item.slug === slug)
  if (!place) notFound()
  return { title: `${place.name} — выставочная площадка`, description: place.address }
}

export default async function ExpositionPlacePage({ params }: Props) {
  const { slug } = await params
  const place = EXPOSITION_PLACES.find((item) => item.slug === slug)
  if (!place) notFound()
  return (
    <ExpositionShell placeName={place.name} overlay>
      <section className="project-hero exposition-detail-hero" aria-labelledby="exposition-place-title">
        <div className="project-hero__media">
          <ExpositionPhotoPlaceholder label="Главная фотография площадки" />
        </div>
        <div className="project-hero__veil" />
        <div className="project-hero__stage">
          <div className="project-hero__intro">
            <div className="project-hero__heading">
              <h1 id="exposition-place-title">{place.name}</h1>
            </div>
          </div>
          <div className="project-hero__bar exposition-detail-hero__bar">
            <address>{place.address}</address>
            <LeadDialogButton label="Записаться на экскурсию" heading={`Экскурсия в ${place.name}`}
              submitLabel="Записаться на экскурсию" pageId={`exposition/${place.slug}`}
              meta={{ requestType: 'exposition-tour', exposition: place.slug }} />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="exposition-houses-title">
        <div className="section__inner">
          <h2 id="exposition-houses-title">Выставочные дома</h2>
          <div className="project-bento exposition-detail-gallery">
            {Array.from({ length: 6 }, (_, index) => (
              <ExpositionPhotoPlaceholder key={index} label="Фотография выставочного дома"
                className={index === 0 ? 'project-bento__lead' : ''} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--muted" aria-labelledby="exposition-plan-title">
        <div className="section__inner">
          <h2 id="exposition-plan-title">План площадки</h2>
          <div className="project-plans__body">
            <ExpositionPhotoPlaceholder label="План выставочной площадки" />
            <div className="project-plans__legend exposition-detail__description">
              <h3>Расположение домов</h3>
              <p>План площадки и список выставочных домов будут добавлены.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--ink" aria-labelledby="exposition-interiors-title">
        <div className="section__inner">
          <h2 id="exposition-interiors-title">Интерьеры выставочных домов</h2>
          <div className="project-rows exposition-detail-gallery">
            {Array.from({ length: 6 }, (_, index) => (
              <ExpositionPhotoPlaceholder key={index} label="Фотография интерьера" />
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="exposition-visit-title">
        <div className="section__inner exposition-hero__layout">
          <div className="exposition-detail__visit">
            <h2 id="exposition-visit-title">Приезжайте на экскурсию</h2>
            <address>{place.address}</address>
            <p>Описание площадки и информация о посещении будут добавлены.</p>
          </div>
            <LeadForm siteId={SITE.id} pageId={`exposition/${place.slug}`} variant="card"
              heading="Записаться на экскурсию"
              body="Оставьте контакты, мы свяжемся с вами и согласуем удобное время."
              submitLabel="Записаться на экскурсию"
              meta={{ requestType: 'exposition-tour', exposition: place.slug }} />
        </div>
      </section>
    </ExpositionShell>
  )
}
