'use client'
import { CMSContentBlock } from '../cms-content'
import { OfficeMap } from '../office-map'
import { FACTORY_CENTER, FACTORY_MAP_ZOOM, FACTORY_POINT_URL, FACTORY_ROUTE_URL } from '../../lib/office'
import { OpenDayArrow, OpenDayRules } from './rules'
import type { OpenDayEvent } from '../../lib/open-day'

export function FactoryOpenDayLocation({ date, event }: { date: string; event?: OpenDayEvent | null }) {
  const center: [number, number] = event?.latitude != null && event.longitude != null ? [event.latitude, event.longitude] : [...FACTORY_CENTER]
  const route = event?.routeUrl || (event?.latitude != null ? `https://yandex.ru/maps/?rtext=~${center[0]},${center[1]}&rtt=auto` : FACTORY_ROUTE_URL)
  const point = event?.latitude != null ? `https://yandex.ru/maps/?pt=${center[1]},${center[0]}&z=16` : FACTORY_POINT_URL
  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayLocation">{<section className="ags ags-loc">
    <OpenDayRules />
    <div className="ags-sheet">
      <div className="ags-loc__body">
        <div className="ags-loc__col">
          <h2 className="ags-loc__title">Как доехать</h2>
          <dl className="ags-spec">
            <div className="ags-spec__row"><dt>Адрес</dt><dd>{event?.address || <>Н. Новгород, <strong>ул. Зайцева, 31к1</strong></>}</dd></div>
            <div className="ags-spec__row"><dt>Ориентир</dt><dd>{event?.landmark || 'Проходная бывшего завода ЗКПД-4'}</dd></div>
            <div className="ags-spec__row"><dt>Дата</dt><dd><span className="ags-live" data-cms-content-connected>{date}</span></dd></div>
          </dl>
          <nav className="ags-ref ags-ref--routes" aria-label="Маршрут до производства">
            <div className="ags-ref__acts">
              <a className="ags-goto" href={route} target="_blank" rel="noopener noreferrer">Построить маршрут <OpenDayArrow size={15} /></a>
              <a className="ags-goto ags-goto--quiet" href={point} target="_blank" rel="noopener noreferrer">Открыть точку на карте <OpenDayArrow size={15} /></a>
            </div>
          </nav>
        </div>
        <OfficeMap
          className="ags-loc__map"
          skeleton
          center={center}
          zoom={FACTORY_MAP_ZOOM}
          routeUrl={route}
          ariaLabel="Открыть карту производства Авангард Строй"
          markerLabel={event?.markerLabel || 'Авангард Строй'}
        />
      </div>
    </div>
  </section>}</CMSContentBlock>)
}
