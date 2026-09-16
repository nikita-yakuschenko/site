'use client'

import { useState } from 'react'
import { IconArrowUpRight, IconBus, IconMapPin } from '@tabler/icons-react'
import { copy, nbspText } from '../lib/copy'
import {
  CONTACT_PLACES,
  type ContactPlace,
  type ContactPlaceId,
} from '../lib/office'
import { OfficeMap } from './office-map'

/** Адрес и остановки одного места — и для живого слоя, и для сайзера. */
function PlaceCopyBody({ place }: { place: ContactPlace }) {
  return (
    <>
      <p className="contacts__address">
        <IconMapPin size={18} stroke={1.75} aria-hidden="true" />
        <span>
          <span className="contacts__address-title">
            {nbspText(place.title)}
          </span>
          {place.line ? (
            <span className="contacts__address-line">
              {nbspText(place.line)}
            </span>
          ) : null}
        </span>
      </p>
      <ul className="contacts__transit">
        {place.transit.map((stop) => (
          <li key={stop.name}>
            <IconBus size={18} stroke={1.75} aria-hidden="true" />
            <span className="contacts__transit-name">
              {nbspText(stop.name)}
            </span>
            <span className="contacts__transit-distance">
              {stop.distance}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Плашка «где мы»: офис и производство на одних табах.
 * Карта пересоздаётся по key места — иначе JS API оставляет старый центр.
 *
 * Высота copy фиксируется сайзером: все места лежат в одной клетке grid,
 * невидимые задают max-высоту. Иначе на мобилке офис (1 строка адреса,
 * 2 остановки) короче производства (2 строки, 3 остановки) — карта и
 * кнопка прыгают. На десктопе прыжок маскировал 1fr у колонки.
 */
export function ContactsPlace() {
  const [placeId, setPlaceId] = useState<ContactPlaceId>('office')
  const place =
    CONTACT_PLACES.find((item) => item.id === placeId) ?? CONTACT_PLACES[0]
  // CONTACT_PLACES не пустой: офис и производство заданы в office.ts.
  if (!place) return null

  return (
    <div className="contacts__place">
      <div className="contacts__tabs" role="tablist" aria-label={copy.contacts}>
        {CONTACT_PLACES.map((item) => {
          const selected = item.id === place.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? 'contacts__tab is-active'
                  : 'contacts__tab'
              }
              onClick={() => setPlaceId(item.id)}
            >
              {item.tab}
            </button>
          )
        })}
      </div>

      <div className="contacts__place-copy">
        {CONTACT_PLACES.map((item) => (
          <div
            key={`sizer-${item.id}`}
            className="contacts__place-sizer"
            aria-hidden="true"
          >
            <PlaceCopyBody place={item} />
          </div>
        ))}
        <div className="contacts__place-live">
          <PlaceCopyBody place={place} />
        </div>
      </div>

      <OfficeMap
        key={place.id}
        className="contacts__map"
        skeleton
        center={place.center}
        zoom={place.zoom}
        routeUrl={place.routeUrl}
        ariaLabel={place.mapLabel}
      />

      <a
        className="contacts__route"
        href={place.routeUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {copy.officeVisit}
        <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
      </a>
    </div>
  )
}
