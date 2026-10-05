import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { ExpositionShell } from '../../components/exposition-shell'
import { ExpositionLocations } from '../../components/exposition-locations'
import { ExpositionVisit } from '../../components/exposition-visit'
import { LeadDialogButton } from '../../components/lead-dialog'
import { EXPOSITION_PLACES } from '../../lib/exposition'
import { CATALOG_PROJECTS } from '../../lib/catalog/projects'
import { PhotoTile } from '../../components/photo-tile'
import { ExpositionVideoTile } from '../../components/exposition-video-tile'
import { ProjectCard } from '../../components/project-card'

export const metadata: Metadata = {
  title: 'Выставочные площадки',
  description: 'Посмотрите дома вживую на площадках Авангард и Высокий Квартал. Запись на экскурсию.',
}
const projects = ['norvegiya-132', 'barnhouse-90', 'barnhouse-115']
  .flatMap((slug) => CATALOG_PROJECTS.filter((project) => project.slug === slug))
function TourButton({ place }: { place?: (typeof EXPOSITION_PLACES)[number] }) {
  return <LeadDialogButton label="Записаться на экскурсию"
    heading={place ? `Экскурсия в ${place.name}` : 'Записаться на экскурсию'}
    body="Оставьте контакты, мы свяжемся с вами и согласуем удобное время."
    submitLabel="Записаться на экскурсию" pageId="exposition"
    meta={{ requestType: 'exposition-tour', ...(place ? { exposition: place.slug } : {}) }} />
}
export default function ExpositionPage() {
  return (
    <ExpositionShell>
      <section className="section exposition-hero" aria-labelledby="exposition-title">
        <div className="section__inner mortgage-family">
          <div className="mortgage-family__media">
            <Image className="mortgage-family__image" src="/img/pages/exposition-main.jpg" alt="Дом с просторной террасой среди берёз" fill preload sizes="(max-width: 767px) 100vw, 60vw" />
          </div>
          <div className="mortgage-family__body exposition-hero__copy">
            <h1 id="exposition-title">Лучше один раз увидеть</h1>
            <p>Посмотрите наши дома вживую. Пройдитесь по комнатам, оцените материалы, планировки и качество исполнения.</p>
            <div className="mortgage-family__actions"><TourButton /></div>
            <span className="exposition-hero__caption">2 площадки · Нижний Новгород и область</span>
          </div>
        </div>
      </section>
      <section className="section exposition-places" id="places" aria-label="Наши выставочные площадки">
        <div className="section__inner exposition-places__grid">
          {EXPOSITION_PLACES.map((place, index) => index === 0 ? (
            <ExpositionVideoTile key={place.slug} href={`/exposition/${place.slug}`} title={place.name} address={place.address} mobileAddress={place.shortAddress} />
          ) : (
            <PhotoTile key={place.slug} className="exposition-place"
              href={`/exposition/${place.slug}`} title={place.name} address={place.address} mobileAddress={place.shortAddress}
              image="/img/pages/vysokiy-kvartal-aerial.webp" quality={90}
              sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1199px) calc(50vw - 32px), 568px" />
          ))}
        </div>
      </section>
      <ExpositionVisit />
      <section className="section exposition-projects" aria-labelledby="exposition-projects-title">
        <div className="section__inner">
          <div className="section__head"><h2 id="exposition-projects-title">Знакомство с домом<br />начинается здесь</h2><Link className="btn btn-yellow section__catalog-cta section__catalog-cta--desktop" href="/catalog">Все проекты домов <IconArrowUpRight size={18} stroke={2} /></Link></div>
          <p className="exposition-projects__intro">Изучите проекты перед поездкой. Какие дома доступны для просмотра на площадке, уточним при записи.</p>
          <div className="grid-3">{projects.map((project) => <ProjectCard key={project.id} project={project} showPrice={false}
            locationLabel={project.slug === 'norvegiya-132' ? 'Авангард' : 'Высокий Квартал'} />)}</div>
          <Link className="btn btn-yellow section__catalog-cta section__catalog-cta--mobile" href="/catalog">Все проекты домов <IconArrowUpRight size={18} stroke={2} /></Link>
        </div>
      </section>
      <section className="section exposition-directions" aria-labelledby="directions-title"><div className="section__inner"><ExpositionLocations /></div></section>
    </ExpositionShell>
  )
}
