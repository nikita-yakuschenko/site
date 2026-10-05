'use client'

import { useState } from 'react'
import { IconDoorEnter, IconLayoutGrid, IconMapPin, IconTag } from '@tabler/icons-react'
import { EXPOSITION_PLACES, expositionRouteUrl } from '../lib/exposition'
import { LeadDialogButton } from './lead-dialog'
import { OfficeMap } from './office-map'

type ExpositionPlace = (typeof EXPOSITION_PLACES)[number]

function PlaceCopyBody({ place }: { place: ExpositionPlace }) {
  const statistics = [
    { label: 'Представлено проектов', value: place.exposition.presentedProjects, Icon: IconLayoutGrid },
    { label: 'Дома с доступом', value: place.exposition.accessibleHomes, Icon: IconDoorEnter },
    { label: 'Дома в продаже', value: place.exposition.homesForSale, Icon: IconTag },
  ]
  return <>
    <p className="contacts__address">
      <IconMapPin size={18} stroke={1.75} aria-hidden="true" />
      <span>
        <span className="contacts__address-title">{place.shortAddress}</span>
        <span className="contacts__address-line exposition-locations__full-address">{place.address}</span>
      </span>
    </p>
    <div className="exposition-locations__exposition">
      <h3>Экспозиция</h3>
      <dl className="exposition-locations__stats">{statistics.map(({ label, value, Icon }, index) => <div className={`exposition-locations__stat${index === 0 ? ' exposition-locations__stat--primary' : ''}`} key={label}>
        <dt className="exposition-locations__stat-label"><Icon size={20} stroke={1.75} aria-hidden="true" /><span>{label}</span></dt>
        <dd className="exposition-locations__stat-value">{value}</dd>
      </div>)}</dl>
    </div>
  </>
}

export function ExpositionLocations({ place: fixedPlace, pageId = 'exposition' }: {
  place?: ExpositionPlace
  pageId?: string
}) {
  const [selected, setSelected] = useState(0)
  const place = fixedPlace ?? EXPOSITION_PLACES[selected] ?? EXPOSITION_PLACES[0]
  const routeUrl = expositionRouteUrl(place.coordinates)

  return <>
    <h2 id="directions-title">Запишитесь на просмотр домов</h2>
    <div className={`contacts__place exposition-locations${fixedPlace ? ' exposition-locations--single' : ''}`}>
      {!fixedPlace && <div className="contacts__tabs" role="tablist" aria-label="Выставочные площадки">
        {EXPOSITION_PLACES.map((item, index) => <button
          key={item.slug} id={`exposition-tab-${item.slug}`} type="button" role="tab"
          className={`contacts__tab${selected === index ? ' is-active' : ''}`}
          aria-selected={selected === index} aria-controls="exposition-location-panel"
          tabIndex={selected === index ? 0 : -1}
          onClick={() => setSelected(index)}
          onKeyDown={(event) => {
            let next: number
            if (event.key === 'ArrowRight') next = (index + 1) % EXPOSITION_PLACES.length
            else if (event.key === 'ArrowLeft') next = (index + EXPOSITION_PLACES.length - 1) % EXPOSITION_PLACES.length
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = EXPOSITION_PLACES.length - 1
            else return
            event.preventDefault()
            setSelected(next)
            event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus()
          }}
        >{item.name}</button>)}
      </div>}
      <div className="contacts__place-copy">
        {!fixedPlace && EXPOSITION_PLACES.map((item) => <div key={item.slug} className="contacts__place-sizer" aria-hidden="true"><PlaceCopyBody place={item} /></div>)}
        <div className="contacts__place-live" id="exposition-location-panel" role={fixedPlace ? undefined : 'tabpanel'}
          aria-labelledby={fixedPlace ? undefined : `exposition-tab-${place.slug}`}><PlaceCopyBody place={place} /></div>
      </div>
      <OfficeMap key={`map-${place.slug}`} className="contacts__map" skeleton
        center={place.coordinates} markerLabel={place.name}
        routeUrl={routeUrl} ariaLabel={`Открыть площадку ${place.name} в Яндекс Картах`} />
      <div className="exposition-locations__actions" key={`actions-${place.slug}`}>
        <LeadDialogButton label={`Посетить КП ${place.name}`} heading={`Экскурсия в ${place.name}`}
          body="Оставьте контакты, мы свяжемся с вами и согласуем удобное время."
          submitLabel="Записаться на экскурсию" pageId={pageId}
          meta={{ requestType: 'exposition-tour', exposition: place.slug }} />
        <a className="exposition-locations__route" href={routeUrl} target="_blank" rel="noopener noreferrer">Построить маршрут</a>
      </div>
    </div>
  </>
}
