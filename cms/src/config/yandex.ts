// Публичный номер счётчика с прода. Пока в CMS пусто — сайт и панель берут его.
export const fallbackMetricaCounterId = '112879989'

export type YandexSettings = {
  metricaEnabled?: boolean | null
  metricaCounterId?: string | null
  metricaConnectedAt?: string | null
  mapsEnabled?: boolean | null
  mapsApiKey?: string | null
}

export function normalizeMetricaCounterId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : ''
  return /^\d{6,12}$/.test(id) ? id : ''
}

export function normalizeMapsApiKey(value: unknown) {
  const key = typeof value === 'string' ? value.trim() : ''
  return /^[a-zA-Z0-9-]{20,80}$/.test(key) ? key : ''
}

export function metricaIsEnabled(settings: YandexSettings) {
  return settings.metricaEnabled !== false
}

export function mapsIsEnabled(settings: YandexSettings) {
  return settings.mapsEnabled !== false
}

export function publicMetrica(settings: YandexSettings) {
  const counterId = normalizeMetricaCounterId(settings.metricaCounterId)
  const enabled = metricaIsEnabled(settings)
  return {
    enabled,
    counterId: enabled ? counterId || null : null,
    configured: Boolean(counterId),
  }
}

export function publicMapsKey(settings: YandexSettings) {
  const key = normalizeMapsApiKey(settings.mapsApiKey)
  const enabled = mapsIsEnabled(settings)
  return {
    enabled,
    key: enabled ? key : '',
    configured: Boolean(key),
  }
}
