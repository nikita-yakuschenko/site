export const FAVORITES_KEY = 'avgst:favorites'

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[]): void {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids))
}

export function toggleFavorite(id: string): string[] {
  const current = readFavorites()
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  writeFavorites(next)
  return next
}
