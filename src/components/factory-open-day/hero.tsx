import Link from 'next/link'
import { OpenDayBookButton } from './form'
import { OpenDayArrow, OpenDayRules } from './rules'
import { OpenDayThemeToggle } from './theme'

const points = [
  ['Узнайте, как строится ваш будущий дом', 'Покажем производство и технологии, которые используем.'],
  ['Почувствуете себя как дома', 'Посетите выставочные дома, сравните планировки и выпейте согревающий глинтвейн.'],
  ['Познакомитесь с трендами загородной архитектуры', 'Архитектор расскажет о последних тенденциях, цветовых решениях и актуальных проектах 2027 года.'],
  ['Сколько стоит свой дом в 2027?', 'Разберём изменения на рынке ИЖС, условия по ипотеке и ежемесячный платёж.'],
]

export function FactoryOpenDayHero() {
  return (
    <section className="ags ags-hero">
      <OpenDayRules />
      <div className="ags-sheet">
        <header className="ags-hero__rail">
          <img className="ags-hero__symbol" src="/factory-open-day/mark.svg" alt="" />
          <img className="ags-hero__logo" src="/factory-open-day/logo.svg" alt="Авангард Строй" />
          <nav className="ags-hero__nav" aria-label="Основная навигация">
            <Link href="/catalog">Каталог домов</Link>
            <Link href="/">Основной сайт</Link>
          </nav>
          <OpenDayThemeToggle />
        </header>
        <div className="ags-hero__body">
          <div className="ags-hero__lead">
            <h1 className="ags-hero__title">Новый взгляд<br />на загородный дом</h1>
            <p className="ags-hero__subtitle"><span className="ags-hero__subtitle-highlight">Какие дома будут строить в этом сезоне?</span></p>
            <div className="ags-hero__intro">
              <p className="ags-hero__text">14 ноября разберём архитектурные тренды, цветовые решения, актуальные планировки и проекты, а главное — покажем, как они воплощаются в готовом доме.</p>
              <ul className="ags-hero__benefits">
                {points.map(([title, text]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ags-hero__act">
              <OpenDayBookButton className="ags-cta">Записаться <OpenDayArrow /></OpenDayBookButton>
              <p className="ags-hero__free">Бесплатно, по записи</p>
            </div>
          </div>
          <figure className="ags-hero__photo">
            <img src="/factory-open-day/hero.webp" alt="Гости в выставочном доме «Авангард Строй»" width={1024} height={1536} />
            <figcaption>Выставочный дом «Авангард Строй», Нижний Новгород</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
