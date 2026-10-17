import { OpenDayArrow, OpenDayRules } from './rules'

export function FactoryOpenDayHero() {
  return <section className="ags ags-hero">
    <OpenDayRules />
    <div className="ags-sheet">
      <header className="ags-hero__rail">
        <img className="ags-hero__logo" src="/factory-open-day/logo.svg" alt="Авангард Строй" width={199} height={56} />
        <nav className="ags-hero__nav" aria-label="Основная навигация">
          <a href="/catalog">Каталог домов</a>
          <a href="/">Основной сайт</a>
        </nav>
      </header>
      <div className="ags-hero__body">
        <div className="ags-hero__lead">
          <h1 className="ags-hero__title">День открытых дверей<br />на производстве<br />«Авангард Строй»</h1>
          <p className="ags-hero__subtitle"><span className="ags-hero__subtitle-highlight">Посмотрите, как производится ваш дом.</span></p>
          <div className="ags-hero__intro">
            <p className="ags-hero__text"><strong>12 сентября</strong> производство «Авангард Строй» открывает двери.</p>
            <ul className="ags-hero__benefits" role="list">
              <li><strong>Пройдёте весь путь производства</strong><span>От отбора пиломатериала до готового дома под крышей.</span></li>
              <li><strong>Посмотрите дом изнутри</strong><span>Обойдёте будущий дом, а не только увидите его на картинке.</span></li>
              <li><strong>Зададите вопросы архитектору</strong><span>Обсудите то, что важно решить до начала стройки.</span></li>
            </ul>
          </div>
          <div className="ags-hero__act">
            <a href="#ags-form" className="ags-cta">Записаться <OpenDayArrow /></a>
            <p className="ags-hero__free">Бесплатно, по записи</p>
          </div>
        </div>
        <figure className="ags-hero__photo">
          <img src="/factory-open-day/factory.webp" alt="Сборка каркасных домов в цеху «Авангард Строй»" width={1680} height={1120} decoding="async" fetchPriority="high" />
          <figcaption>Производство «Авангард Строй», Нижний Новгород</figcaption>
        </figure>
      </div>
    </div>
  </section>
}
