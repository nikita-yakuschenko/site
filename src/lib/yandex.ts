// Публичный номер счётчика с прода. Пока в CMS пусто — сайт берёт его или ENV.
export const fallbackMetricaCounterId = '112879989'

function cmsOrigin() {
  return process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
}

function envMetricaCounterId() {
  const fromEnv = Number(process.env.NEXT_PUBLIC_YM_ID) || 0
  return fromEnv > 0 ? String(fromEnv) : ''
}

function envMapsApiKey() {
  return (process.env.NEXT_PUBLIC_YANDEX_MAPS_KEY ?? '').trim()
}

export async function activeMetricaCounterId() {
  try {
    const response = await fetch(`${cmsOrigin()}/api/globals/lead-delivery/metrica`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) {
      return Number(envMetricaCounterId() || fallbackMetricaCounterId) || 0
    }
    const data = await response.json() as { counterId?: string | null; enabled?: boolean; configured?: boolean }
    if (data.enabled === false) return 0
    if (data.configured && !data.counterId) return 0
    const counterId = typeof data.counterId === 'string' ? data.counterId.trim() : ''
    if (/^\d{6,12}$/.test(counterId)) return Number(counterId)
    return Number(envMetricaCounterId() || fallbackMetricaCounterId) || 0
  } catch {
    return Number(envMetricaCounterId() || fallbackMetricaCounterId) || 0
  }
}

export async function activeMapsApiKey() {
  try {
    const response = await fetch(`${cmsOrigin()}/api/globals/lead-delivery/maps-key`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return envMapsApiKey()
    const data = await response.json() as { key?: string; enabled?: boolean; configured?: boolean }
    if (data.enabled === false) return ''
    const key = typeof data.key === 'string' ? data.key.trim() : ''
    if (/^[a-zA-Z0-9-]{20,80}$/.test(key)) return key
    // Пока ключ не сохранён в CMS — берём ENV сайта, чтобы карта не пропала.
    return envMapsApiKey()
  } catch {
    return envMapsApiKey()
  }
}
