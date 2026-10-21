/** Разрешённые параметры источника заявки, без произвольных cookie. */
export const LEAD_ATTRIBUTION_COOKIE = 'avgst_lead_attribution'
export const attributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_referrer', 'yclid', 'gclid', '_ym_uid'] as const
export type Attribution = Partial<Record<typeof attributionKeys[number] | 'landing_page', string>>

export function attributionFromUrl(raw: string): Attribution {
  try {
    const url = new URL(raw)
    return Object.fromEntries(attributionKeys.flatMap(key => {
      const value = url.searchParams.get(key)?.trim().slice(0, 500)
      return value ? [[key, value]] : []
    }))
  } catch { return {} }
}

export function readAttribution(raw?: string | null): Attribution {
  try {
    const data = JSON.parse(decodeURIComponent(raw || ''))
    return Object.fromEntries([...attributionKeys, 'landing_page'].flatMap(key => typeof data?.[key] === 'string' ? [[key, data[key].slice(0, key === 'landing_page' ? 1500 : 500)]] : []))
  } catch { return {} }
}

export function leadAttribution(sourceUrl: string | undefined, cookie: string): Attribution & { roistatVisit?: string } {
  const cookies = new Map(cookie.split(';').map(part => { const i = part.indexOf('='); return [part.slice(0, i).trim(), part.slice(i + 1)] }))
  const current = attributionFromUrl(sourceUrl || '')
  const saved = readAttribution(cookies.get(LEAD_ATTRIBUTION_COOKIE))
  const result: Attribution & { roistatVisit?: string } = Object.keys(current).some(key => key.startsWith('utm_')) ? { ...current, landing_page: sourceUrl?.slice(0, 1500) } : { ...saved, ...current }
  for (const key of ['_ym_uid', 'yclid'] as const) {
    const value = cookies.get(key)
    if ((key === '_ym_uid' || !result[key]) && value && /^[0-9]{1,64}$/.test(value)) result[key] = value
  }
  const visit = cookies.get('roistat_visit')
  if (visit && /^[\w-]{1,64}$/.test(visit)) result.roistatVisit = visit
  return result
}
