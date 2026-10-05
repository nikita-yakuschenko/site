import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import { SiteChrome } from '../../components/site-chrome'
import { LeadDialogButton } from '../../components/lead-dialog'
import { AboutTimeline } from '../../components/about-timeline'
import { footerAboutFor } from '../../lib/copy'
import { SITE } from '../../lib/site'

export const metadata: Metadata = {
  title: 'О компании — Авангард Строй',
  description: 'Строим загородные дома с 2014 года. Собственное производство и история Авангард Строй.',
}

export default function AboutPage() {
  const history = [
    { year: '2014', events: [['Первые дома', 'Начало строительства каркасных домов, дач и бань.'], ['Инженерные системы', 'Развитие направления инженерных коммуникаций.']] },
    { year: '2015', events: [['Собственный склад', 'Открытие склада в Нижнем Новгороде для хранения леса и пиломатериалов.']] },
    { year: '2019', events: [['Готовые дома', 'Начало строительства домов на продажу.'], ['Видеоблог', 'Запуск видеоблога компании.']] },
    { year: '2021', events: [['Посёлок «Авангард»', 'Создание собственного посёлка.'], ['Покрасочный цех', 'Развитие производственной базы.'], ['Барнхаусы', 'Создание новой линейки домов.']] },
    { year: '2022', events: [['Завод домокомплектов', 'Запуск производства панельно-каркасных домов.']] },
    { year: '2023', events: [['Модульное производство', 'Запуск второй производственной линии.'], ['Open Village', 'Участие в выставке загородных домов.']] },
    { year: '2024', events: [['Десять лет компании', 'Юбилей Авангард Строй.'], ['Эскроу-счета', 'Начало работы с эскроу-счетами.']] },
  ]
  return (
    <SiteChrome name={SITE.name} phone={SITE.contacts.phone} email={SITE.contacts.email}
      address={SITE.contacts.address} navigation={[...SITE.navigation]} overlay
      footer={SITE.footer.legal} about={footerAboutFor(SITE.name)}
      subrow={<nav className="project-hero__crumbs" aria-label="Хлебные крошки"><Link href="/">Главная</Link><IconChevronRight size={14} stroke={2} aria-hidden /><span aria-current="page">О компании</span></nav>}>
      <main className="about-page">
        <section className="section project-hero about-hero" aria-labelledby="about-title">
          <div className="project-hero__media"><Image src="/img/pages/exposition-main.jpg" alt="Загородный дом с террасой среди деревьев" fill preload sizes="100vw" /></div>
          <div className="project-hero__veil" />
          <div className="project-hero__stage">
            <div className="project-hero__intro">
              <div className="project-hero__heading">
                <div className="project-hero__labels"><p className="project-hero__badge">Производственно-строительная компания</p></div>
                <h1 id="about-title">Авангард <span>Строй</span></h1>
              </div>
            </div>
          </div>
        </section>
        <section className="section" aria-labelledby="about-intro"><div className="section__inner about-copy">
          <h2 id="about-intro">Строим дома, в которые хочется возвращаться</h2><p>Мы — строительная компания из Нижнего Новгорода. С 2014 года строим деревянные дома, дачи и бани. Сегодня наши направления — каркасные, панельно-каркасные и модульные дома.</p><p>Помогаем пройти путь от выбора проекта до готового дома: с планировкой, строительством и инженерными системами.</p><div className="about-actions"><Link className="btn btn-yellow" href="/catalog">Выбрать проект дома</Link><Link className="btn btn-outline" href="/exposition">Посмотреть дома вживую</Link></div>
        </div></section>
        <section className="section about-tinted" aria-labelledby="about-production"><div className="section__inner about-split">
          <div className="about-photo"><Image src="/production/factory.jpg" alt="Производство домокомплектов Авангард Строй" fill sizes="(max-width: 767px) 100vw, 50vw" /></div>
          <div className="about-copy"><h2 id="about-production">Собственное производство</h2><p>Домокомплекты изготавливаем на своём заводе в Нижнем Новгороде. Собственный склад позволяет хранить материалы и готовить их к работе.</p><p>Посмотрите, как детали превращаются в панели, а панели — в готовый модуль.</p><Link className="btn btn-yellow" href="/manufacture">Как мы производим дома</Link></div>
        </div></section>
        <section className="section" aria-labelledby="about-work"><div className="section__inner"><h2 id="about-work">Как мы работаем</h2><div className="about-principles">
          <article><h3>Материалы и хранение</h3><p>Работаем с проверенными поставщиками и следим за условиями хранения материалов.</p></article>
          <article><h3>Строительство на виду</h3><p>Предоставляем фотоотчёты со стройки и осуществляем технический надзор.</p></article>
          <article><h3>Один подрядчик</h3><p>Объединяем строительство, отделку и инженерные системы, чтобы вам не пришлось искать отдельного исполнителя на каждый этап.</p></article>
        </div></div></section>
        <section className="section about-tinted" aria-labelledby="about-history"><div className="section__inner"><AboutTimeline><ol className="about-history">{history.map(({ year, events }) => <li className="about-history__year" key={year}><section aria-labelledby={`history-${year}`}><h3 id={`history-${year}`}><time dateTime={year}>{year}</time></h3><ol className="about-history__milestones">{events.map(([title, text]) => <li className="about-history__event" key={title}><h4>{title}</h4><p>{text}</p></li>)}</ol></section></li>)}</ol></AboutTimeline></div></section>
        <section className="section" aria-labelledby="about-meet"><div className="section__inner about-split">
          <div className="about-copy"><h2 id="about-meet">Давайте познакомимся</h2><p>Начните с прогулки по выставочному дому или разговора о вашем будущем проекте.</p><p>Наш офис: {SITE.contacts.address}. Позвоните нам: <a href={`tel:${SITE.contacts.phone.replace(/[^+\d]/g, '')}`}>{SITE.contacts.phone}</a>.</p><div className="about-actions"><LeadDialogButton label="Обсудить мой дом" heading="Обсудить будущий дом" pageId="about" /><Link className="btn btn-outline" href="/exposition">Выставочные площадки</Link></div></div>
          <div className="about-photo"><Image src="/img/pages/exposition-interior.jpg" alt="Интерьер выставочного дома" fill sizes="(max-width: 767px) 100vw, 50vw" /></div>
        </div></section>
      </main>
    </SiteChrome>
  )
}
