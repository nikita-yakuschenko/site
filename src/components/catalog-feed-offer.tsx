'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IconArrowUpRight, IconBox, IconDimensions, IconLayout2, IconMapPin, IconMountain, IconSun } from '@tabler/icons-react'
import { LeadDialog } from './lead-dialog'
import { architectConsultation, exhibitionVisit } from './project-lead-offers'
import exhibitionArt from '../../public/img/выставочн.png'
import architectArt from '../../public/img/архитектор.png'
import sitePlanningArt from '../../public/img/посадка.png'
import mortgageArt from '../../public/img/онлайн.png'

const offers = [
  {
    kind: 'exhibition',
    background: '#e3e8e2',
    art: exhibitionArt,
    title: 'Посетите выставочный дом',
    description: 'Оцените качество, планировку и интерьер',
    label: 'Записаться на просмотр выставочного дома',
    form: exhibitionVisit,
  },
  {
    kind: 'architect',
    background: '#f2e0d3',
    art: architectArt,
    title: 'Консультация с архитектором',
    description: 'Обсудим проект, планировку и пожелания',
    label: 'Записаться на консультацию с архитектором',
    topics: [{ label: 'Планировка', Icon: IconLayout2 }, { label: 'Комплектация', Icon: IconBox }, { label: 'Размеры', Icon: IconDimensions }],
    form: architectConsultation,
  },
  {
    kind: 'site-planning',
    enabled: false,
    background: '#dde5ed',
    art: sitePlanningArt,
    title: 'Посадка дома на участок',
    description: 'Подберём оптимальное размещение дома',
    label: 'Обсудить посадку дома на участок',
    topics: [{ label: 'Рельеф', Icon: IconMountain }, { label: 'Инсоляция', Icon: IconSun }, { label: 'Расположение', Icon: IconMapPin }],
    form: { ...architectConsultation, heading: 'Посадка дома на участок' },
  },
  {
    kind: 'mortgage',
    background: '#f3e8bf',
    art: mortgageArt,
    title: 'Одобрение ипотеки онлайн',
    description: 'Узнайте решение банка, не выходя из дома',
    label: 'Подать заявку на одобрение ипотеки онлайн',
    cta: 'Отправить заявку',
    form: {
      heading: 'Одобрение ипотеки онлайн',
      body: 'Оставьте имя и телефон. Свяжемся с вами, поможем подобрать ипотечную программу и подать заявку.',
      submitLabel: 'Отправить заявку',
      formId: 'mortgage-consultation',
    },
  },
].filter(offer => offer.enabled !== false)

export function CatalogFeedOffer({ index, layout }: { index: number; layout: 'mobile' | 'wide' }) {
  const [open, setOpen] = useState(false)
  const offer = offers[index % offers.length]
  if (!offer) return null

  return (
    <div className="catalog__feed-offer" data-layout={layout} data-offer={offer.kind}>
      <button type="button" className="catalog__feed-offer-trigger" style={{ backgroundColor: offer.background }} aria-label={offer.label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="catalog__feed-offer-copy">
          <strong>{offer.title}</strong>
          <span className="catalog__feed-offer-description">{offer.description}</span>
          {offer.topics ? (
            <span className="catalog__feed-offer-topics">
              {offer.topics.map(({ label, Icon }) => <span key={label}><Icon aria-hidden="true" />{label}</span>)}
            </span>
          ) : (
            <span className="catalog__feed-offer-cta">{offer.cta ?? 'Записаться'} <IconArrowUpRight aria-hidden="true" /></span>
          )}
        </span>
        {offer.art && <span className="catalog__feed-offer-art" aria-hidden="true">
          <Image src={offer.art} alt="" unoptimized />
        </span>}
      </button>
      {open && <LeadDialog {...offer.form} cardBackground={offer.background} onClose={() => setOpen(false)} />}
    </div>
  )
}
