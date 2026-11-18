'use client'

import { useState } from 'react'
import { getImageProps } from 'next/image'
import { LeadDialog } from './lead-dialog'
import { architectConsultation, exhibitionVisit } from './project-lead-offers'
import exhibition from '../../public/promo/catalog-exhibition.png'
import exhibitionMobile from '../../public/promo/catalog-exhibition-mobile.png'
import architect from '../../public/promo/catalog-architect.png'
import architectMobile from '../../public/promo/catalog-architect-mobile.png'
import sitePlanning from '../../public/promo/catalog-site-planning.png'
import sitePlanningMobile from '../../public/promo/catalog-site-planning-mobile.png'

const offers = [
  { label: 'Записаться на просмотр выставочного дома', desktop: exhibition, mobile: exhibitionMobile, form: exhibitionVisit },
  { label: 'Записаться на консультацию с архитектором', desktop: architect, mobile: architectMobile, form: architectConsultation },
  { label: 'Обсудить посадку дома на участок', desktop: sitePlanning, mobile: sitePlanningMobile, form: { ...architectConsultation, heading: 'Посадка дома на участок' } },
]

export function CatalogFeedOffer({ index, layout }: { index: number; layout: 'mobile' | 'wide' }) {
  const [open, setOpen] = useState(false)
  const offer = offers[index % offers.length]
  if (!offer) return null
  const wide = layout === 'wide'
  const { props } = getImageProps({
    src: wide ? offer.desktop : offer.mobile,
    alt: '',
    sizes: wide ? '(min-width: 1280px) 866px, (min-width: 1024px) 72vw, 100vw' : '100vw',
  })

  return (
    <div className="catalog__feed-offer" data-layout={layout}>
      <button type="button" className="catalog__mortgage-trigger" aria-label={offer.label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {/* getImageProps supplies the responsive sources and intrinsic dimensions. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...props} />
      </button>
      {open && <LeadDialog {...offer.form} onClose={() => setOpen(false)} />}
    </div>
  )
}
