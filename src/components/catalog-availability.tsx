'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ReadyHousesContext = createContext(false)
const CatalogCollectionsContext = createContext<readonly string[]>([])

export function CatalogAvailabilityProvider({ readyHouses, collections, children }: { readyHouses: boolean; collections: readonly string[]; children: ReactNode }) {
  return <ReadyHousesContext.Provider value={readyHouses}><CatalogCollectionsContext.Provider value={collections}>{children}</CatalogCollectionsContext.Provider></ReadyHousesContext.Provider>
}

export function useReadyHouses() {
  return useContext(ReadyHousesContext)
}

export function useCatalogCollections() {
  return useContext(CatalogCollectionsContext)
}
