'use client'

import { useEffect, useRef, useState } from 'react'
import {
  OFFICE_CENTER,
  OFFICE_MAP_ZOOM,
  YANDEX_MAPS_KEY,
  yandexMapsLoaderUrl,
} from '../lib/office'
import { SITE } from '../lib/site'

/**
 * Карта офиса без интерфейса Яндекс.Карт.
 *
 * Загрузчик 2.1 приезжает при первом открытии панели, а не вместе со
 * страницей: в шапке карта нужна редко, а библиотека весит заметно.
 * Органы управления выключены (`controls: []`), блок «Открыть в Яндекс.
 * Картах» подавлен, жесты сняты — карта работает как превью, клик по ней
 * обрабатывает ссылка снаружи. Строка копирайта остаётся: её скрытие
 * нарушало бы лицензию.
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

/** Загрузчик один на страницу: панель открывают много раз, скрипт нужен раз. */
let loader: Promise<Ymaps> | null = null

function loadYmaps(): Promise<Ymaps> {
  if (loader) return loader
  loader = new Promise<Ymaps>((resolve, reject) => {
    if (globalThis.ymaps) {
      resolve(globalThis.ymaps)
      return
    }
    const script = document.createElement('script')
    script.src = yandexMapsLoaderUrl(YANDEX_MAPS_KEY)
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

export function OfficeMap() {
  const host = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // Без ключа выходим молча: состояние не трогаем, рендер и так вернёт null.
    if (!YANDEX_MAPS_KEY) return

    let map: YmapsMap | null = null
    let cancelled = false

    loadYmaps()
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
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      map?.destroy()
    }
  }, [])

  if (failed || !YANDEX_MAPS_KEY) return null

  return <div className="site-office__map-canvas" ref={host} aria-hidden="true" />
}
