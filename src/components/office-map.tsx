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
 * к собственному API ключ читается уже из runtime env работающего контейнера.
 *
 * Карта офиса/производства — necessary: показывает адрес компании, без неё
 * блок контактов не выполняет свою задачу. JS API грузится сразу.
 */

type YmapsMap = {
  destroy: () => void
  behaviors: { disable: (list: string[]) => void }
  geoObjects: { add: (obj: unknown) => void }
  container: { fitToViewport: () => void }
}

type YmapsNs = {
  ready: (cb: () => void) => void
  Map: new (
    el: HTMLElement,
    state: { center: readonly [number, number]; zoom: number; controls: string[] },
    options?: Record<string, unknown>,
  ) => YmapsMap
  Placemark: new (
    coords: readonly [number, number],
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown
}

declare global {
  interface Window {
    ymaps?: YmapsNs
  }
}

let loader: Promise<YmapsNs> | null = null

function readKey(): Promise<string | null> {
  return fetch('/api/maps-key')
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { key?: string } | null) => data?.key || null)
    .catch(() => null)
}

function loadYmaps(apikey: string): Promise<YmapsNs> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('ymaps: no window'))
  }
  if (window.ymaps) return Promise.resolve(window.ymaps)
  if (loader) return loader
  loader = new Promise<YmapsNs>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps-loader]')
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.ymaps) resolve(window.ymaps)
        else reject(new Error('ymaps missing after load'))
      })
      existing.addEventListener('error', () => reject(new Error('ymaps script error')))
      return
    }
    const script = document.createElement('script')
    script.src = yandexMapsLoaderUrl(apikey)
    script.async = true
    script.dataset.ymapsLoader = '1'
    script.onload = () => {
      if (window.ymaps) resolve(window.ymaps)
      else reject(new Error('ymaps missing after load'))
    }
    script.onerror = () => reject(new Error('ymaps script error'))
    document.head.appendChild(script)
  }).catch((err) => {
    loader = null
    throw err
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
