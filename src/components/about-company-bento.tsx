import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight } from '@tabler/icons-react'
import { BankStrip, type BankPartner } from './bank-strip'
import { nbspText } from '../lib/copy'

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
    <section className="section about-company" aria-labelledby="about-company-today">
      <div className="section__inner">
        <h2 id="about-company-today">Авангард Строй Сегодня</h2>
        <div className="company-bento">
          <figure className="company-bento__tile company-bento__mission">
            <Image className="company-bento__logo" src="/logo_lg.svg" alt="Авангард Строй" width={144} height={40} />
            <blockquote>
              <p>{nbspText('Мы воплощаем для людей мечту о собственном доме и пространстве, где они будут сохранять семейные ценности и традиции. Через индустриальный подход делаем путь к дому простым и доступным.')}</p>
            </blockquote>
            <figcaption>Команда Авангард Строй</figcaption>
          </figure>

          <Link className="company-bento__tile company-bento__factory" href="/manufacture">
            <div className="company-bento__factory-heading">
              <div><h3>AS Prefab</h3><p>Индустриальный подход</p></div>
              <IconArrowUpRight size={20} stroke={2} aria-hidden />
            </div>
            <div className="company-bento__factory-photo">
              <Image src="/production/factory.jpg" alt="Изготовление стен и перекрытий на заводе Авангард Строй" fill sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 900px) 50vw, 384px" />
            </div>
          </Link>
          {/* Preserve the approved grid slots until their content is selected. */}
          <div className="company-bento__tile company-bento__slot company-bento__slot--right" aria-hidden="true" />
          <div className="company-bento__tile company-bento__slot company-bento__slot--bottom-left" aria-hidden="true" />
          <div className="company-bento__tile company-bento__slot company-bento__slot--bottom-middle" aria-hidden="true" />
          <div className="company-bento__tile company-bento__slot company-bento__slot--bottom-right" aria-hidden="true" />
          <div className="company-partners" role="group" aria-labelledby="company-partners-title">
            <h3 id="company-partners-title">Ведущие банки-партнёры</h3>
            <BankStrip partners={BANK_PARTNERS} />
          </div>
        </div>
      </div>
    </section>
  )
}
