'use client'

import { useEffect, useRef, useState } from 'react'
import { copy } from '../lib/copy'
import {
  OFFICE_CENTER,
  OFFICE_MAP_ZOOM,
  OFFICE_ROUTE_URL,
  yandexMapsLoaderUrl,
} from '../lib/office'
import { SITE } from '../lib/site'

/**
 * Карта офиса без интерфейса Яндекс.Карт.
 *
 * Ключ берётся из /api/maps-key в рантайме, а не из NEXT_PUBLIC_-переменной:
 * такая переменная вшивается на этапе `next build`, который идёт внутри
 * `docker build`, куда окружение контейнера Dokploy не попадает. С запросом
 * ключ подхватывается при запуске и меняется без пересборки.
 *
 * Библиотека 2.1 приезжает при первом открытии панели, а не вместе со
 * страницей. Органы управления выключены (`controls: []`), блок «Открыть в
 * Яндекс.Картах» подавлен, жесты сняты — карта работает как превью, клик по
 * ней ведёт на маршрут. Строка копирайта остаётся: её скрытие нарушало бы
 * лицензию.
 */

type YmapsMap = { destroy: () => void }

type Ymaps = {
  ready: (callback: () => void) => void
  Map: new (
    element: HTMLElement,
    state: { center: readonly [number, number]; zoom: number; controls: readonly string[] },
    options: { suppressMapOpenBlock: boolean; yandexMapDisablePoiInteractivity: boolean },
  ) => YmapsMap & {
    behaviors: { disable: (names: readonly string[]) => void }
    geoObjects: { add: (object: unknown) => void }
  }
  Placemark: new (
    coords: readonly [number, number],
    properties: Record<string, unknown>,
    options: Record<string, unknown>,
  ) => unknown
}

declare global {
  var ymaps: Ymaps | undefined
}

/** Ключ и загрузчик — по одному на страницу: панель открывают много раз. */
let keyRequest: Promise<string> | null = null
let loader: Promise<Ymaps> | null = null

function readKey(): Promise<string> {
  if (keyRequest) return keyRequest
  keyRequest = fetch('/api/maps-key')
    .then((response) => (response.ok ? response.json() : { key: '' }))
    .then((data: { key?: string }) => data.key ?? '')
  keyRequest.catch(() => {
    keyRequest = null
  })
  return keyRequest
}

function loadYmaps(apikey: string): Promise<Ymaps> {
  if (loader) return loader
  loader = new Promise<Ymaps>((resolve, reject) => {
    if (globalThis.ymaps) {
      resolve(globalThis.ymaps)
      return
    }
    const script = document.createElement('script')
    script.src = yandexMapsLoaderUrl(apikey)
    script.async = true
    script.onload = () => {
      if (globalThis.ymaps) resolve(globalThis.ymaps)
      else reject(new Error('ymaps не появился после загрузки скрипта'))
    }
    script.onerror = () => reject(new Error('не удалось загрузить JS API Яндекс.Карт'))
    document.head.appendChild(script)
  })
  // Неудачную попытку не кешируем: при следующем открытии панели пробуем снова.
  loader.catch(() => {
    loader = null
  })
  return loader
}

export function OfficeMap({ onNavigate }: { onNavigate?: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let map: YmapsMap | null = null
    let cancelled = false

    readKey()
      .then((apikey) => {
        // Ключа нет — карта просто не показывается, панель остаётся рабочей.
        if (!apikey) throw new Error('ключ JS API не задан')
        return loadYmaps(apikey)
      })
      .then((ymaps) => {
        ymaps.ready(() => {
          if (cancelled || !host.current) return
          const instance = new ymaps.Map(
            host.current,
            { center: OFFICE_CENTER, zoom: OFFICE_MAP_ZOOM, controls: [] },
            // Организации на карте не должны перехватывать клик: он наш.
            { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
          )
          instance.behaviors.disable(['drag', 'scrollZoom', 'dblClickZoom', 'multiTouch'])
          // Растягивающийся пин: подпись живёт внутри метки и тянет её по
          // ширине текста. Точечный пин молчал о том, чей это адрес.
          instance.geoObjects.add(
            new ymaps.Placemark(
              OFFICE_CENTER,
              { iconContent: SITE.name },
              { preset: 'islands#redStretchyIcon' },
            ),
          )
          map = instance
          setReady(true)
        })
      })
      .catch(() => {
        // Молча: блок карты остаётся неотрисованным.
      })

    return () => {
      cancelled = true
      map?.destroy()
    }
  }, [])

  return (
    <a
      className={ready ? 'site-office__map is-ready' : 'site-office__map'}
      href={OFFICE_ROUTE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.officeMapOpen}
      aria-hidden={ready ? undefined : true}
      tabIndex={ready ? undefined : -1}
      onClick={onNavigate}
    >
      <div className="site-office__map-canvas" ref={host} />
    </a>
  )
}
