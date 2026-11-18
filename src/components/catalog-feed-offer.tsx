'use client'

import { useState } from 'react'
import Image from 'next/image'
import { optimizedSrc } from '../lib/media'
import { LeadDialog } from './lead-dialog'
import { architectConsultation, exhibitionVisit } from './project-lead-offers'
const exhibition = '/promo/catalog-exhibition.png'
const exhibitionMobile = '/promo/catalog-exhibition-mobile.png'
const architect = '/promo/catalog-architect.png'
const architectMobile = '/promo/catalog-architect-mobile.png'
const sitePlanning = '/promo/catalog-site-planning.png'
const sitePlanningMobile = '/promo/catalog-site-planning-mobile.png'

const offers = [
  { label: 'Записаться на просмотр выставочного дома', desktop: exhibition, mobile: exhibitionMobile, form: exhibitionVisit },
  { label: 'Записаться на консультацию с архитектором', desktop: architect, mobile: architectMobile, form: architectConsultation },
  { label: 'Обсудить посадку дома на участок', desktop: sitePlanning, mobile: sitePlanningMobile, form: { ...architectConsultation, heading: 'Посадка дома на участок' } },
]

export function CatalogFeedOffer({ index, layout }: { index: number; layout: 'mobile' | 'wide' }) {
  const [open, setOpen] = useState(false)
  const offer = offers[index % offers.length]
  if (!offer) return null
  const image = layout === 'wide' ? offer.desktop : offer.mobile
  return (
    <div className="catalog__feed-offer" data-layout={layout}>
      <button type="button" className="catalog__mortgage-trigger" aria-label={offer.label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Image src={optimizedSrc(image)} alt="" width={layout === 'wide' ? 866 : 373} height={layout === 'wide' ? 120 : image === architectMobile ? 88 : 84} unoptimized />
      </button>
      {open && <LeadDialog {...offer.form} onClose={() => setOpen(false)} />}
    </div>
  )
}
