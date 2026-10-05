import { yandexMapsLoaderUrl } from './office'

export type YmapsPlacemark = {
  options: { set: (name: string, value: unknown) => void }
  events: { add: (name: string, callback: () => void) => void }
}

export type YmapsMap = {
  destroy: () => void
  behaviors: { disable: (list: string[]) => void }
  geoObjects: {
    add: (obj: unknown) => void
    getBounds: () => readonly (readonly [number, number])[] | null
  }
  setBounds: (bounds: readonly (readonly [number, number])[], options?: Record<string, unknown>) => unknown
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
  ) => YmapsPlacemark
}

declare global {
  interface Window {
    ymaps?: YmapsNs
  }
}

let loader: Promise<YmapsNs> | null = null

function loadYmaps(apikey: string): Promise<YmapsNs> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ymaps: no window'))
  if (window.ymaps) return Promise.resolve(window.ymaps)
  if (loader) return loader
  loader = new Promise<YmapsNs>((resolve, reject) => {
    const onLoad = () => window.ymaps
      ? resolve(window.ymaps)
      : reject(new Error('ymaps missing after load'))
    const onError = () => reject(new Error('ymaps script error'))
    const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps-loader]')
    if (existing) {
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onError, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = yandexMapsLoaderUrl(apikey)
    script.async = true
    script.dataset.ymapsLoader = '1'
    script.onload = onLoad
    script.onerror = onError
    document.head.appendChild(script)
  }).catch((error) => {
    document.querySelector('script[data-ymaps-loader]')?.remove()
    loader = null
    throw error
  })
  return loader
}

/** Один загрузчик и runtime-ключ для карт контактов и выставочных площадок. */
export async function loadYandexMaps() {
  if (typeof window !== 'undefined' && window.ymaps) return window.ymaps
  const response = await fetch('/api/maps-key')
  const data: { key?: string } | null = response.ok ? await response.json() : null
  if (!data?.key) throw new Error('ключ JS API не задан')
  return loadYmaps(data.key)
}
