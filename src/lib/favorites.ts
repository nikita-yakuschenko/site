import { canPersistFunctional } from '../consent/functional-persist'

export const FAVORITES_KEY = 'avgst:favorites'

const EMPTY: string[] = []

/**
 * Избранное живёт в localStorage — это внешнее по отношению к React хранилище.
 * Поэтому оно оформлено как источник для useSyncExternalStore: компоненты
 * подписываются на него и не тянут состояние через эффект. Побочный эффект
 * приятный — карточки одного проекта на странице и соседние вкладки браузера
 * остаются согласованы между собой.
 */
const listeners = new Set<() => void>()

// Снимок кешируется: useSyncExternalStore сравнивает результаты по ссылке,
// и новый массив на каждый вызов означал бы бесконечный цикл рендеров.
let snapshot: string[] = EMPTY
let snapshotRaw: string | null = null

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return EMPTY
    const ids = parsed.filter((id): id is string => typeof id === 'string')
    return ids.length ? ids : EMPTY
  } catch {
    return EMPTY
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function readFavorites(): string[] {
  if (typeof window === 'undefined') return EMPTY
  const raw = window.localStorage.getItem(FAVORITES_KEY)
  if (raw !== snapshotRaw) {
    snapshotRaw = raw
    snapshot = parse(raw)
  }
  return snapshot
}

/** Снимок для сервера: до гидратации избранного нет ни у кого. */
export function readServerFavorites(): string[] {
  return EMPTY
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener)
  // Изменения из соседней вкладки приходят событием storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === FAVORITES_KEY) notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function writeFavorites(ids: string[]): void {
  // Без functional consent не создаём persistent identifier.
  if (!canPersistFunctional()) {
    notify()
    return
  }
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids))
  notify()
}

export function toggleFavorite(id: string): string[] {
  if (!canPersistFunctional()) return readFavorites()
  const current = readFavorites()
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  writeFavorites(next)
  return next
}
