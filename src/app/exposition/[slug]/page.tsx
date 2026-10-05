import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ExpositionShell, ExpositionPhotoPlaceholder } from '../../../components/exposition-shell'
import { ExpositionLocations } from '../../../components/exposition-locations'
import { ExpositionVisit } from '../../../components/exposition-visit'
import { ExpositionTourGallery } from '../../../components/exposition-tour-gallery'
import { LeadDialogButton } from '../../../components/lead-dialog'
import { ProjectCard } from '../../../components/project-card'
import { CATALOG_PROJECTS } from '../../../lib/catalog/projects'
import { EXPOSITION_PLACES } from '../../../lib/exposition'

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
  const projects = place.projectSlugs.flatMap((projectSlug) => CATALOG_PROJECTS.filter((project) => project.slug === projectSlug))
  return (
    <ExpositionShell placeName={place.name} overlay>
      <section className="project-hero exposition-detail-hero" aria-labelledby="exposition-place-title">
        <div className="project-hero__media">
          {place.slug === 'vysokiy-kvartal' ? (
            <Image src="/img/pages/vysokiy-kvartal-aerial.webp" alt="Панорама КП Высокий Квартал с высоты"
              fill preload sizes="(max-aspect-ratio: 16/9) 178svh, 100vw" quality={90} />
          ) : (
            <Image className="exposition-detail-hero__avangard-image" src="/img/pages/avangard-hero.webp"
              alt="Дом с террасой на площадке Авангард среди берёз"
              fill preload sizes="(max-aspect-ratio: 5/4) 125svh, 100vw" quality={90} />
          )}
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

      <section className="section exposition-detail-projects" aria-labelledby="exposition-projects-title">
        <div className="section__inner">
          <h2 id="exposition-projects-title">Проекты в экспозиции</h2>
          {projects.length > 0 ? (
            <div className="grid-2">{projects.map((project) => <ProjectCard key={project.id} project={project} showPrice={false} />)}</div>
          ) : <div className="project-bento exposition-detail-gallery">
            {Array.from({ length: 6 }, (_, index) => (
              <ExpositionPhotoPlaceholder key={index} label="Фотография выставочного дома"
                className={index === 0 ? 'project-bento__lead' : ''} />
            ))}
          </div>}
        </div>
      </section>

      <ExpositionVisit />

      <section className="section section--ink" aria-labelledby="exposition-tour-title">
        <div className="section__inner">
          <h2 id="exposition-tour-title">Как проходит экскурсия</h2>
          {place.tourPhotos.length > 0 ? <ExpositionTourGallery photos={place.tourPhotos} /> : <div className="project-bento exposition-detail-gallery exposition-tour-gallery">
            {Array.from({ length: 6 }, (_, index) => (
              <ExpositionPhotoPlaceholder key={index} label="Фото с дня открытых дверей"
                className={index === 0 ? 'project-bento__lead' : ''} />
            ))}
          </div>}
        </div>
      </section>

      <section className="section exposition-directions" aria-labelledby="directions-title">
        <div className="section__inner">
          <ExpositionLocations place={place} pageId={`exposition/${place.slug}`} />
        </div>
      </section>
    </ExpositionShell>
  )
}
