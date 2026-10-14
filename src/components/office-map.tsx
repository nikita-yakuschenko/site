'use client'

import { useEffect, useRef, useState } from 'react'
import { copy } from '../lib/copy'
import {
  OFFICE_CENTER,
  OFFICE_MAP_ZOOM,
  OFFICE_ROUTE_URL,
} from '../lib/office'
import { SITE } from '../lib/site'
import { loadYandexMaps, type YmapsMap } from '../lib/yandex-maps'

/**
 * Карта офиса без интерфейса Яндекс.Карт.
 *
 * Ключ берётся из /api/maps-key в рантайме, а не из NEXT_PUBLIC_-переменной:
 * такая переменная вшивается на этапе `next build`, который идёт внутри
 * `docker build`, куда окружение контейнера Dokploy не попадает. С запросом
 * к собственному API ключ читается уже из runtime env работающего контейнера.
 *
 * Карта офиса/производства — necessary: показывает адрес компании, без неё
 * блок контактов не выполняет свою задачу. Библиотека карт тяжёлая, поэтому
 * скрипт запрашивается, только когда блок уже рядом с экраном.
 */

export function OfficeMap({
  onNavigate,
  className = 'site-office__map',
  skeleton = false,
  center = OFFICE_CENTER,
  zoom = OFFICE_MAP_ZOOM,
  routeUrl = OFFICE_ROUTE_URL,
  ariaLabel = copy.officeMapOpen,
  markerLabel = SITE.name,
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
  markerLabel?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'pending' | 'ready' | 'failed'>('pending')

  useEffect(() => {
    let map: YmapsMap | null = null
    let cancelled = false
    let resizeObserver: ResizeObserver | null = null
    let logoObserver: MutationObserver | null = null
    let stopWatch: (() => void) | null = null

    const start = () => {
      if (cancelled) return
      stopWatch?.()
      stopWatch = null
    loadYandexMaps()
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
              { iconContent: markerLabel },
              { preset: 'islands#redStretchyIcon' },
            ),
          )
          map = instance
          const labelLogo = () => {
            host.current?.querySelectorAll('a[class*="copyright__logo"]').forEach((logo) => {
              if (!logo.getAttribute('aria-label')) logo.setAttribute('aria-label', 'Яндекс')
            })
          }
          labelLogo()
          if (host.current) {
            logoObserver = new MutationObserver(labelLogo)
            logoObserver.observe(host.current, { childList: true, subtree: true })
          }
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
    }

    const node = host.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      start()
    } else {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        start()
      }, { rootMargin: '400px' })
      observer.observe(node)
      stopWatch = () => observer.disconnect()
    }

    return () => {
      cancelled = true
      stopWatch?.()
      logoObserver?.disconnect()
      resizeObserver?.disconnect()
      map?.destroy()
    }
  }, [center, zoom, markerLabel])

  const stateClass =
    status === 'ready'
      ? 'is-ready'
      : skeleton && status === 'pending'
        ? 'is-loading'
        : skeleton && status === 'failed'
          ? 'is-failed'
          : ''
  const interactive = status === 'ready' || skeleton
  const label = markerLabel && !ariaLabel.includes(markerLabel) ? `${ariaLabel}, ${markerLabel}` : ariaLabel

  return (
    <div className={[className, stateClass].filter(Boolean).join(' ')}>
      {skeleton && status === 'pending' ? (
        <span className="office-map-skeleton" aria-hidden="true" />
      ) : null}
      <a
        className="office-map__hit"
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        aria-busy={skeleton && status === 'pending' ? true : undefined}
        aria-hidden={interactive ? undefined : true}
        tabIndex={interactive ? undefined : -1}
        onClick={onNavigate}
      />
      <div className="site-office__map-canvas" ref={host} />
    </div>
  )
}
