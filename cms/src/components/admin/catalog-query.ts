const catalogQueryKey = 'avgst-catalog-query'

export function savedTableQuery(key: string) {
  return typeof window === 'undefined' ? '' : localStorage.getItem(key) || ''
}
export function rememberTableQuery(key: string, query: string) {
  if (query) localStorage.setItem(key, query)
  else localStorage.removeItem(key)
}

export function catalogHref() {
  const saved = typeof window === 'undefined' ? '' : localStorage.getItem(catalogQueryKey) || ''
  return saved ? `/catalog?${saved}` : '/catalog'
}

export function rememberCatalogQuery(query: string) {
  rememberTableQuery(catalogQueryKey, query)
}

export function savedCatalogQuery() {
  return savedTableQuery(catalogQueryKey)
}
