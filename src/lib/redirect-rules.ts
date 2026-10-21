export type RedirectRule = { source: string; target: string }
const siteOrigin = 'https://avgst.ru'

export function redirectPath(value: string, source = false): string {
  const raw = value.trim()
  if (!raw || /[\s\\]/.test(raw) || [...raw].some(char => char.charCodeAt(0) < 32)) throw new Error('Укажите корректный адрес без пробелов')
  const url = new URL(raw, siteOrigin)
  if (!['https://avgst.ru', 'https://new.avgst.ru'].includes(url.origin)) throw new Error('Выберите страницу этого сайта')
  if (!raw.startsWith('/') && !raw.startsWith('https://')) throw new Error('Адрес должен начинаться с / или https://avgst.ru/')
  if (url.username || url.password || /[\[\]*]/.test(url.pathname)) throw new Error('Укажите конкретную страницу')
  if (source && (url.search || url.hash || /^\/(api|next|_next)(?:\/|$)/.test(url.pathname))) throw new Error('Исходный адрес должен быть без параметров и служебных маршрутов')
  return (url.pathname.replace(/\/+$/, '') || '/') + url.search + url.hash
}

export function redirectTarget(source: string, rules: readonly RedirectRule[]): string | null {
  const bySource = new Map(rules.map(rule => [rule.source, rule.target]))
  let current = source
  const visited = new Set<string>()
  while (true) {
    const url = new URL(current, siteOrigin)
    const key = url.pathname.replace(/\/+$/, '') || '/'
    const next = bySource.get(key)
    if (!next) return current === source ? null : current
    if (visited.has(key)) throw new Error('Эти соответствия образуют цикл переадресаций')
    visited.add(key)
    const target = new URL(next, siteOrigin)
    // Keep incoming attribution/filter parameters unless the target specifies its own value.
    for (const [name, value] of url.searchParams) if (!target.searchParams.has(name)) target.searchParams.append(name, value)
    current = target.pathname + target.search + target.hash
  }
}
