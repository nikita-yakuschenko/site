const catalogQueryKey = 'avgst-catalog-query'

export function catalogHref() {
  const saved = typeof window === 'undefined' ? '' : localStorage.getItem(catalogQueryKey) || ''
  return saved ? `/catalog?${saved}` : '/catalog'
}

export function rememberCatalogQuery(query: string) {
  if (query) localStorage.setItem(catalogQueryKey, query)
  else localStorage.removeItem(catalogQueryKey)
}

export function savedCatalogQuery() {
  return typeof window === 'undefined' ? '' : localStorage.getItem(catalogQueryKey) || ''
}
