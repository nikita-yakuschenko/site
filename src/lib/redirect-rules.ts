export type RedirectRule = { source: string; target: string }
const siteOrigin = 'https://avgst.ru'

export function redirectPath(value: string, source = false): string {
  const raw = value.trim()
  if (!raw || /[\s\\]/.test(raw) || [...raw].some(char => char.charCodeAt(0) < 32)) throw new Error('Укажите корректный адрес без пробелов')
  const url = new URL(raw, siteOrigin)
  const allowedOrigins = source ? ['https://avgst.ru', 'https://new.avgst.ru'] : ['https://avgst.ru', 'https://new.avgst.ru', 'https://old.avgst.ru']
  if (!allowedOrigins.includes(url.origin)) throw new Error('Выберите страницу этого сайта или старого сайта avgst.ru')
  if (!raw.startsWith('/') && !raw.startsWith('https://')) throw new Error('Адрес должен начинаться с / или https://avgst.ru/')
  if (url.username || url.password || /[\[\]*]/.test(url.pathname)) throw new Error('Укажите конкретную страницу')
  if (source && (url.hash || /^\/(api|next|_next)(?:\/|$)/.test(url.pathname))) throw new Error('Исходный адрес должен быть без якоря и служебных маршрутов')
  if (source) {
    const names = [...url.searchParams.keys()]
    if (new Set(names).size !== names.length) throw new Error('Параметры исходного адреса не должны повторяться')
    url.searchParams.sort()
  }
  return url.origin === 'https://old.avgst.ru' ? url.href : (url.pathname.replace(/\/+$/, '') || '/') + url.search + url.hash
}

export function redirectTarget(source: string, rules: readonly RedirectRule[]): string | null {
  const candidates = rules.map(rule => ({ ...rule, url: new URL(rule.source, siteOrigin) }))
    .sort((a, b) => b.url.searchParams.size - a.url.searchParams.size)
  let current = source
  const visited = new Set<string>()
  while (true) {
    const url = new URL(current, siteOrigin)
    if (url.origin !== siteOrigin) return current
    const key = url.pathname.replace(/\/+$/, '') || '/'
    const rule = candidates.find(rule => (rule.url.pathname.replace(/\/+$/, '') || '/') === key &&
      [...rule.url.searchParams].every(([name, value]) => {
        const values = url.searchParams.getAll(name)
        return values.length === 1 && values[0] === value
      }))
    if (!rule) return current === source ? null : current
    if (visited.has(rule.source)) throw new Error('Эти соответствия образуют цикл переадресаций')
    visited.add(rule.source)
    const target = new URL(rule.target, siteOrigin)
    // Keep incoming attribution/filter parameters unless the target specifies its own value.
    for (const [name, value] of url.searchParams) if (!name.startsWith('tfc_') && !target.searchParams.has(name)) target.searchParams.append(name, value)
    current = target.origin === siteOrigin ? target.pathname + target.search + target.hash : target.href
  }
}
