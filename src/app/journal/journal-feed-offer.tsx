'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IconArrowUpRight } from '@tabler/icons-react'
import { LeadDialog } from '@/components/lead-dialog'
import exhibition from '../../../public/promo/journal-exhibition.webp'
import architect from '../../../public/promo/journal-architect.webp'
import mortgage from '../../../public/promo/journal-mortgage.webp'

const offers = [
  {
    image: exhibition, color: '#e3e8e2', title: 'Посетите выставочный дом',
    description: 'Посмотрите планировку, материалы и интерьер вживую.',
    form: { heading: 'Посетите выставочный дом', body: 'Оставьте контакты. Мы подберём удобное время и расскажем, как добраться.', submitLabel: 'Записаться на просмотр', formId: 'exhibition-visit' },
  },
  {
    image: architect, color: '#f2e0d3', title: 'Консультация с архитектором',
    description: 'Обсудите проект, планировку и ваш участок.',
    form: { heading: 'Консультация с архитектором', body: 'Оставьте контакты. Мы перезвоним и запишем вас на консультацию.', submitLabel: 'Записаться', formId: 'architect-consultation' },
  },
  {
    image: mortgage, color: '#f3e8bf', title: 'Одобрение ипотеки онлайн',
    description: 'Поможем подобрать программу и подать заявку.',
    form: { heading: 'Одобрение ипотеки онлайн', body: 'Оставьте имя и телефон. Свяжемся с вами и поможем подать заявку.', submitLabel: 'Отправить заявку', formId: 'mortgage-consultation' },
  },
] as const

export function JournalFeedOffer({ index }: { index: number }) {
  const [open, setOpen] = useState(false)
  const offer = offers[index % offers.length]!
  return <aside className="journal-feed-offer" data-offer-index={index}>
    <button type="button" aria-haspopup="dialog" style={{ backgroundColor: offer.color }} onClick={() => setOpen(true)}>
      <span className="journal-feed-offer__copy"><strong>{offer.title}</strong><span>{offer.description}</span></span>
      <Image src={offer.image} alt="" unoptimized />
      <span className="series-bento__go" aria-hidden="true"><IconArrowUpRight size={18} stroke={2} /></span>
    </button>
    {open && <LeadDialog {...offer.form} pageId="journal" onClose={() => setOpen(false)} />}
  </aside>
}
