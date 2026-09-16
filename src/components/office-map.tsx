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

type YmapsMap = {
  destroy: () => void
  container: { fitToViewport: () => void }
}

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

export function OfficeMap({
  onNavigate,
  className = 'site-office__map',
  skeleton = false,
  center = OFFICE_CENTER,
  zoom = OFFICE_MAP_ZOOM,
  routeUrl = OFFICE_ROUTE_URL,
  ariaLabel = copy.officeMapOpen,
}: {
  onNavigate?: () => void
  /** Класс обёртки: панель офиса и блок контактов делят один компонент. */
  className?: string
  /** Показать скелетон, пока JS API не отрисовал карту (нужно в контактах). */
  skeleton?: boolean
  center?: readonly [number, number]
  zoom?: number
  routeUrl?: string
  ariaLabel?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'pending' | 'ready' | 'failed'>('pending')

  useEffect(() => {
    let map: YmapsMap | null = null
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null

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
            { center, zoom, controls: [] },
            // Организации на карте не должны перехватывать клик: он наш.
            { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true },
          )
          instance.behaviors.disable(['drag', 'scrollZoom', 'dblClickZoom', 'multiTouch'])
          // Растягивающийся пин: подпись живёт внутри метки и тянет её по
          // ширине текста. Точечный пин молчал о том, чей это адрес.
          instance.geoObjects.add(
            new ymaps.Placemark(
              center,
              { iconContent: SITE.name },
              { preset: 'islands#redStretchyIcon' },
            ),
          )
          map = instance
          setStatus('ready')
          // Контейнер контактов тянется по высоте — карта должна
          // пересчитать кадр, иначе остаётся дыра или обрезок.
          resizeObserver = new ResizeObserver(() => {
            map?.container.fitToViewport()
          })
          resizeObserver.observe(host.current)
        })
      })
      .catch(() => {
        if (!cancelled) setStatus('failed')
      })

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      map?.destroy()
    }
  }, [center, zoom])

  const stateClass =
    status === 'ready'
      ? 'is-ready'
      : skeleton && status === 'pending'
        ? 'is-loading'
        : skeleton && status === 'failed'
          ? 'is-failed'
          : ''
  const interactive = status === 'ready' || skeleton

  return (
    <a
      className={[className, stateClass].filter(Boolean).join(' ')}
      href={routeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      aria-busy={skeleton && status === 'pending' ? true : undefined}
      aria-hidden={interactive ? undefined : true}
      tabIndex={interactive ? undefined : -1}
      onClick={onNavigate}
    >
      {skeleton && status === 'pending' ? (
        <span className="office-map-skeleton" aria-hidden="true" />
      ) : null}
      <div className="site-office__map-canvas" ref={host} />
    </a>
  )
}
