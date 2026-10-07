import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { BankStrip, type BankPartner } from './bank-strip'
import { CoverageMapGraphic } from './coverage-map-graphic'
import { nbspText } from '../lib/copy'
import aboutBentoProject from '../../public/img/pages/about-bento-project.png'
import productionEquipment from '../../public/img/pages/wbz.png'
import modularTechnology from '../../public/img/pages/modular_tech.png'
import panelTechnology from '../../public/img/pages/panel_tech.png'
import industrialApproach from '../../public/img/pages/industrial.png'

const BANK_PARTNERS: BankPartner[] = [
  { name: 'СберБанк', src: '/logos/banks/sber.svg' },
  { name: 'ВТБ', src: '/logos/banks/vtb.svg' },
  { name: 'ДОМ.РФ', src: '/logos/banks/domrf.svg' },
  { name: 'Россельхозбанк', src: '/logos/banks/rshb.svg' },
  { name: 'Примсоцбанк', src: '/logos/banks/primsoc.svg', inkSrc: '/logos/banks/primsoc-ink.svg' },
  { name: 'Центр-инвест', src: '/logos/banks/centr-invest.svg' },
]

export function AboutCompanyBento() {
  return (
    <section className="section about-company" aria-label="О компании">
      <div className="section__inner">
        <div className="company-bento">
          <article className="company-bento__tile company-bento__hero" aria-labelledby="company-bento-title">
            <Image className="company-bento__hero-image" src={aboutBentoProject} alt="" fill sizes="(max-width: 1024px) calc(100vw - 48px), 768px" />
            <Link className="company-bento__project-link" href="/catalog/barnhouse-138" aria-label="Посмотреть проект Барнхаус 147">
              <span className="company-bento__project-badge">Барнхаус 147</span>
              <IconArrowUpRight size={20} stroke={2} aria-hidden />
            </Link>
            <div className="company-bento__hero-content">
              <Image className="company-bento__logo" src="/logo_lg.svg" alt="Авангард Строй" width={144} height={40} />
              <h2 id="company-bento-title">{nbspText('Делаем путь к своему дому')}<br />{nbspText('простым и предсказуемым')}</h2>
              <p className="company-bento__hero-description">
                <span>{nbspText('Проектируем, производим и строим')}</span>
                <span>{nbspText('панельно-каркасные и модульные дома')}</span>
                <span>{nbspText('для жизни и отдыха')}</span>
              </p>
            </div>
            <Link className="btn btn-yellow company-bento__catalog-cta" href="/catalog">
              Выбрать проект
              <IconArrowUpRight size={18} stroke={2} aria-hidden />
            </Link>
          </article>

          <Link className="company-bento__tile company-bento__factory" href="/manufacture">
            <div className="company-bento__factory-heading">
              <div><h3>Индустриальный<br />подход</h3></div>
              <IconArrowUpRight size={20} stroke={2} aria-hidden />
            </div>
            <div className="company-bento__factory-photo">
              <Image src={industrialApproach} alt="Индустриальный подход к строительству домов" fill sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 1024px) 50vw, 384px" />
            </div>
          </Link>
          <Link className="company-bento__tile company-bento__technologies" href="/manufacture" aria-label="2 технологии домов — подробнее о производстве">
            <div className="company-bento__technologies-heading">
              <h3>2 технологии домов</h3>
              <IconArrowUpRight size={20} stroke={2} aria-hidden />
            </div>
            <div className="company-bento__technology-list">
              <figure>
                <div className="company-bento__technology-image">
                  <Image src={panelTechnology} alt="Панели для панельно-каркасной технологии" fill sizes="(max-width: 600px) 45vw, (max-width: 1024px) 25vw, 160px" />
                </div>
                <figcaption>Панельно-каркасная</figcaption>
              </figure>
              <figure>
                <div className="company-bento__technology-image">
                  <Image src={modularTechnology} alt="Дом по модульной технологии" fill sizes="(max-width: 600px) 45vw, (max-width: 1024px) 25vw, 160px" />
                </div>
                <figcaption>Модульная</figcaption>
              </figure>
            </div>
          </Link>
          <article className="company-bento__tile company-bento__production" aria-labelledby="company-bento-production-title">
            <div className="company-bento__production-photo">
              <Image className="company-bento__production-image" src={productionEquipment} alt="Оборудование собственного производства Авангард Строй" fill sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 1024px) 50vw, 374px" />
            </div>
            <div className="company-bento__production-copy">
              <h3 id="company-bento-production-title">Собственное<br />производство</h3>
              <p>{nbspText('Современное оборудование')}<br />{nbspText('и контроль качества')}</p>
            </div>
          </article>
          {/* Preserve the approved grid slots until their content is selected. */}
          <div className="company-bento__tile company-bento__slot company-bento__slot--card-middle" aria-hidden="true" />
          <div className="company-bento__tile company-bento__slot company-bento__slot--card-right" aria-hidden="true" />
          <article className="company-bento__tile company-bento__coverage" aria-labelledby="company-bento-coverage-title">
            <div className="company-bento__coverage-copy">
              <h3 id="company-bento-coverage-title">
                {nbspText('Строим в радиусе')}
                <span className="company-bento__coverage-radius"><strong>1000 км</strong></span>
              </h3>
              <p className="company-bento__coverage-caption">С любовью<br />{nbspText('из Столицы Поволжья')}</p>
            </div>
            <CoverageMapGraphic />
            <CoverageMapGraphic compact />
          </article>
          <div className="company-partners" role="group" aria-labelledby="company-partners-title">
            <h3 id="company-partners-title">Банки-партнёры</h3>
            <BankStrip partners={BANK_PARTNERS} layout="grid" />
          </div>
        </div>
      </div>
    </section>
  )
}
