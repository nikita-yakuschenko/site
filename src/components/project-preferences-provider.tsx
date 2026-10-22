'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useConsent } from '../consent/ConsentProvider'
import { canPersistFunctional } from '../consent/functional-persist'
import { ProjectPreferencesStore, PREFERENCE_NOTICE_KEY } from '../lib/project-preferences'
import { readFavorites, readServerFavorites, subscribeFavorites } from '../lib/favorites'
import type { PreferenceSource } from '../lib/optimization/preferences-contracts'

const Context = createContext<{ enabled: boolean; store: ProjectPreferencesStore } | null>(null)

export function ProjectPreferencesProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { hasConsent } = useConsent()
  const allowed = hasConsent('functional')
  const [store] = useState(() => new ProjectPreferencesStore({
    fetch: (...args) => fetch(...args),
    uuid: () => crypto.randomUUID(),
    storage: () => window.localStorage,
    changed: () => {
      try { window.localStorage.setItem(PREFERENCE_NOTICE_KEY, crypto.randomUUID()) } catch { /* BroadcastChannel also works without storage. */ }
      try { const channel = new BroadcastChannel(PREFERENCE_NOTICE_KEY); channel.postMessage('refresh'); channel.close() } catch { /* Older browsers use storage/focus. */ }
    },
  }))
  useEffect(() => {
    store.setActive(enabled && allowed)
    if (!enabled || !allowed) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      if (!canPersistFunctional()) { store.setActive(false); return }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { store.setActive(true); void store.refresh() }, 80)
    }
    const onStorage = (event: StorageEvent) => { if (event.key === PREFERENCE_NOTICE_KEY || event.key === null || event.key === 'avgst:favorites') refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    let channel: BroadcastChannel | undefined
    try { channel = new BroadcastChannel(PREFERENCE_NOTICE_KEY); channel.onmessage = refresh } catch { /* Optional transport. */ }
    return () => {
      store.setActive(false)
      if (timer) clearTimeout(timer)
      channel?.close()
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, allowed, store])
  return <Context.Provider value={{ enabled, store }}>{children}</Context.Provider>
}

export function useCanonicalPreferences() { return useContext(Context)?.enabled ?? false }

export function useProjectPreference(code: string, source: PreferenceSource) {
  const context = useContext(Context)
  if (!context) throw new Error('ProjectPreferencesProvider is required')
  const { store } = context
  const { openConsentSettings } = useConsent()
  useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot)
  useEffect(() => store.register(code), [store, code])
  const state = store.view(code)
  const toggle = () => {
    if (!canPersistFunctional()) { store.setActive(false); openConsentSettings(); return }
    store.setLiked(code, !store.view(code).liked, source)
  }
  const retry = () => {
    if (!canPersistFunctional()) { openConsentSettings(); return }
    store.retry(code, source)
  }
  return { ...state, toggle, retry }
}

const emptySubscribe = () => () => {}
const zero = () => 0
export function useProjectFavorites(): string[] {
  const context = useContext(Context)
  const enabled = context?.enabled ?? false
  const store = context?.store
  useSyncExternalStore(enabled && store ? store.subscribe : emptySubscribe, enabled && store ? store.snapshot : zero, zero)
  const legacy = useSyncExternalStore(enabled ? emptySubscribe : subscribeFavorites, enabled ? readServerFavorites : readFavorites, readServerFavorites)
  return enabled && store ? store.favorites() : legacy
}
