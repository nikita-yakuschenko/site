import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { ExpositionShell } from '../../components/exposition-shell'
import { ExpositionLocations } from '../../components/exposition-locations'
import { LeadDialogButton } from '../../components/lead-dialog'
import { EXPOSITION_PLACES } from '../../lib/exposition'
import { CATALOG_PROJECTS } from '../../lib/catalog/projects'
import { PhotoTile } from '../../components/photo-tile'
import { ExpositionVideoTile } from '../../components/exposition-video-tile'

export const metadata: Metadata = {
  title: 'Выставочные площадки',
  description: 'Посмотрите дома вживую на площадках Авангард и Высокий Квартал. Запись на экскурсию.',
}
const benefits = [
  ['Пройдитесь по дому', 'Почувствуйте пространство и реальные размеры комнат.'],
  ['Сравните решения', 'Оцените планировки и выберите то, что подходит вашей семье.'],
  ['Посмотрите материалы', 'Рассмотрите фасады, окна, отделку и детали сборки вблизи.'],
  ['Обсудите свой проект', 'Задайте вопросы о доме, комплектации и строительстве.'],
]
const projects = CATALOG_PROJECTS.filter((project) => ['norvegiya-132-gremyachki', 'barnhouse-115', 'ekohouse-132', 'barnhouse-96', 'ekohouse-120'].includes(project.slug))
const interior = '/catalog/barhhouse-73/12.jpg'
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
            <Image className="mortgage-family__image" src="/img/pages/exposition-houses.png" alt="Дома с террасами на выставочной площадке" fill preload sizes="(max-width: 767px) 100vw, 60vw" />
          </div>
          <div className="mortgage-family__body exposition-hero__copy">
            <h1 id="exposition-title">Выставочные<br />площадки</h1>
            <p>Посмотрите наши дома вживую. Пройдитесь по комнатам, оцените материалы, планировки и качество исполнения.</p>
            <div className="mortgage-family__actions"><TourButton /></div>
            <span className="exposition-hero__caption">2 площадки · Нижний Новгород и область</span>
          </div>
        </div>
      </section>
      <section className="section exposition-places" id="places" aria-label="Наши выставочные площадки">
        <div className="section__inner exposition-places__grid">
          {EXPOSITION_PLACES.map((place, index) => index === 0 ? (
            <ExpositionVideoTile key={place.slug} href={`/exposition/${place.slug}`} title={place.name} address={place.address} />
          ) : (
            <PhotoTile key={place.slug} className="exposition-place"
              href={`/exposition/${place.slug}`} title={place.name} address={place.address}
              image={index === 0 ? '/img/pages/exposition-hero.png' : '/catalog/barnhouse-115/00.jpg'} />
          ))}
        </div>
      </section>
      <section className="section exposition-visit" aria-labelledby="visit-title">
        <div className="section__inner">
          <div className="exposition-visit__top">
            <div><h2 id="visit-title">Не выбирайте дом<br />по картинке</h2></div>
            <div className="exposition-visit__photo"><Image src={interior} alt="Интерьер дома: кухня и гостиная" fill sizes="(max-width: 767px) 100vw, 55vw" /></div>
          </div>
          <ol className="exposition-benefits">{benefits.map(([title, body], index) => <li key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
        </div>
      </section>
      <section className="section exposition-projects" aria-labelledby="exposition-projects-title">
        <div className="section__inner">
          <div className="section__head"><h2 id="exposition-projects-title">Знакомство с домом<br />начинается здесь</h2><Link className="section__link" href="/catalog">Все проекты домов <IconArrowUpRight size={19} /></Link></div>
          <p className="exposition-projects__intro">Изучите проекты перед поездкой. Какие дома доступны для просмотра на площадке, уточним при записи.</p>
          <div className="exposition-projects__rail">{projects.map((project) => <Link className="exposition-project-card" href={project.href} key={project.id}>
            <div className="exposition-project-card__photo"><Image src={project.imageUrl} alt={project.name} fill sizes="(max-width: 767px) 70vw, 230px" /></div>
            <div className="exposition-project-card__copy"><h3>{project.name}</h3><span>{project.area} м² · {project.technologyBadge}</span><IconArrowUpRight size={20} /></div>
          </Link>)}</div>
        </div>
      </section>
      <section className="section exposition-directions" aria-labelledby="directions-title"><div className="section__inner"><ExpositionLocations /></div></section>
      <section className="section exposition-cta" aria-labelledby="tour-title">
        <div className="section__inner exposition-cta__stage">
          <Image src={interior} alt="" fill sizes="(max-width: 1199px) 100vw, 1152px" />
          <div className="exposition-cta__copy"><h2 id="tour-title">Приезжайте<br />посмотреть дом</h2><p>Настоящий построенный дом.<br />Ваши вопросы и время на каждую деталь.</p><TourButton /></div>
        </div>
      </section>
    </ExpositionShell>
  )
}
