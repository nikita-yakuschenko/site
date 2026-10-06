import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconChevronRight } from '@tabler/icons-react'
import { SiteChrome } from '../../components/site-chrome'
import { VideoTestimonials } from '../../components/video-testimonials'
import { AboutTimeline, type HistoryEntry } from '../../components/about-timeline'
import { BlockRenderer } from '../../components/block-renderer'
import { HOME_LAYOUT } from '../../lib/home-layout'
import { footerAboutFor } from '../../lib/copy'
import { SITE } from '../../lib/site'

export const metadata: Metadata = {
  title: 'О компании — Авангард Строй',
  description: 'Строим загородные дома с 2014 года. Собственное производство и история Авангард Строй.',
}

export default function AboutPage() {
  const history: HistoryEntry[] = [
    { year: '2014', events: [['Начало пути', 'Создали компанию «Авангард Строй»,\nзапустили свои первые проекты каркасных дач и бань']], logo: true },
    { year: '2015', stacked: true, events: [['Новый склад', 'Перевезли склад в новое помещение площадью 1700 м²\nчтобы обеспечить больший объём и быстрый темп строительства'], ['Расширение штата', 'Ввели на постоянной основе более 30 строительных бригад']] },
    { year: '2016', stacked: true, images: ['/img/about/forum-2016.png'], imageFit: 'contain', imageAlt: 'Диплом Авангард Строй за участие в Архитектурно-строительном форуме 2016', events: [['Расширение', 'Начали строить за пределами Нижегородской области'], ['Участие в выставке', 'Участвовали в выставке «Нижегородский Архитектурно-Строительный Форум 2016»']] },
    { year: '2017', stacked: true, eventLogos: [null, null, [{ src: '/img/about/rsb-compact.svg', alt: 'Русский Стандарт', width: 1645.45, height: 298.648 }]], events: [['Рост команды', 'Нас стало более 50 человек'], ['Недвижимость и обмен', 'Создали отдел по работе с недвижимостью и запустили программу\n«Обмен квартиры на дом под ключ»'], ['Банковское партнёрство', 'Стали партнёрами банка «Русский Стандарт»']] },
    { year: '2018', stacked: true, eventLogos: [[{ src: '/img/about/sber-compact.svg', alt: 'Сбербанк', width: 528, height: 82 }], null, [{ src: '/img/about/keb-compact.svg', alt: 'КредитЕвропаБанк', width: 752.001, height: 88 }]], events: [['', 'Получили аккредитацию от Сбербанка России.\nОтправить заявку на ипотеку теперь можно прямо из офиса'], ['', 'Запустили видеоблог компании'], ['', 'Подключили кредитную программу с «КредитЕвропаБанк»\nсо специальными процентными ставками']] },
    { year: '2019', stacked: true, images: ['/img/about/inyutino-2019.jpg'], imageAlt: 'Команда Авангард Строй на выставке ИЖС в деревне Инютино', events: [['', 'Начали строить готовые дома на продажу'], ['', 'Более 50 собственных бригад'], ['', 'Провели первую выставку ИЖС в д.\u00a0Инютино']] },
    { year: '2020', images: ['/img/about/paint-shop-2020.png'], imageAlt: 'Собственный покрасочный цех Авангард Строй', stacked: true, eventLogos: [null, [{ src: '/img/about/domrf-compact.svg', alt: 'ДОМ.РФ', width: 191, height: 64 }, { src: '/img/about/rshb-compact.svg', alt: 'Россельхозбанк', width: 263, height: 50 }], null], events: [['', 'Провели серию выставок готовых домов: в д.\u00a0Инютино, с.\u00a0Елховка, д.\u00a0Гремячки'], ['', 'Стали партнёрами банков ДОМ.РФ и Россельхозбанк'], ['', 'Открыли собственный покрасочный цех']] },
    { year: '2021', stacked: true, images: ['/fixtures/factory.jpg', '/img/about/avangard-2021.jpg'], linkWords: ['Авангард', 'производство', 'Барнхаус'], links: ['/exposition/avangard', '/manufacture', '/catalog?series=barn'], events: [['', 'Построили первые дома в коттеджном посёлке Авангард'], ['', 'Запустили производство панель-каркасных домов'], ['', 'Разработали серию домов Барнхаус. Проекты завоевали огромную популярность среди наших клиентов']] },
    { year: '2022', images: ['/production/factory.jpg', '/img/about/open-village-2022-aerial.png', '/img/about/open-village-2022-team.png'], imageAlt: 'Производство и выставка Open Village в 2022 году', eventLogos: [null, { src: '/logos/open_village.svg', alt: 'Open Village', width: 275, height: 45 }], events: [['', 'Увеличили производительность производства до 20 домокомплектов в месяц'], ['', 'Стали участниками всероссийской выставки\nготовых домов Open Village']] },
    { year: '2023', stacked: true, images: ['/img/about/open-village-2023.jpg'], imageAlt: 'Дома Авангард Строй на выставке Open Village 2023', eventLogos: [null, null, { src: '/logos/open_village.svg', alt: 'Open Village', width: 275, height: 45, edition: '23' }], events: [['', 'Застроили коттеджный посёлок Авангард на 90%'], ['', 'Подсчитали, что уже более 3500 семей живут в наших домах'], ['', 'Приняли участие в выставке Open Village 2023']] },
    { year: '2024', images: ['/ranking.png'], imageFit: 'contain', imageAlt: 'Рейтинг подрядчиков ИЖС по версии банка ДОМ.РФ', eventLogos: [null, null, { src: '/logos/open_village.svg', alt: 'Open Village', width: 275, height: 45, edition: '24' }], events: [['Десять лет компании', 'Юбилей Авангард Строй.'], ['Эскроу-счета', 'Начало работы с эскроу-счетами.\nВошли в топ-3 подрядчиков в сегменте ИЖС по версии банка ДОМ.РФ'], ['', 'Приняли участие в выставке Open Village 2024']] },
    { year: '2025', stacked: true, images: ['/img/pages/vysokiy-kvartal-aerial.webp'], imageAlt: 'Коттеджный посёлок Высокий Квартал с высоты', linkWords: ['модульный дом', 'Высокий Квартал'], links: ['/catalog/barnhouse-90', '/exposition/vysokiy-kvartal'], events: [['', 'Первыми в России произвели и смонтировали на участок модульный дом, состоящий из 12-метровых модулей'], ['', 'Начали проектировать и презентовали в рамках III конференции по развитию рынка ИЖС в Нижегородской области коттеджный посёлок Высокий Квартал']] },
    { year: '2026', images: ['/img/pages/uzor128..jpg'], imageAlt: 'Дом серии Узорье', eventLogos: [{ src: '/img/about/dk-compact.svg', alt: 'Домклик', width: 360, height: 92 }], linkWords: ['', 'Узорье'], links: ['', '/catalog?q=%D0%A3%D0%B7%D0%BE%D1%80%D1%8C%D0%B5'], events: [['', 'Вошли в престижный рейтинг сервиса «Домклик» от Сбербанка «топ-50 среди лучших ИЖС застройщиков в России»'], ['', 'Разработали и презентовали серию домов Узорье']] },
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
        <section className="section about-tinted" aria-labelledby="about-history"><div className="section__inner"><AboutTimeline entries={history} /></div></section>
        <BlockRenderer blocks={HOME_LAYOUT.filter(block => block.blockType === 'productionSection')} projects={[]} contacts={SITE.contacts} siteId={SITE.id} pageId="about" />
        <VideoTestimonials showEyebrow={false} />
        <BlockRenderer blocks={HOME_LAYOUT.filter(block => block.blockType === 'contactsSection' || block.blockType === 'leadForm')} projects={[]} contacts={SITE.contacts} siteId={SITE.id} pageId="about" />
      </main>
    </SiteChrome>
  )
}
