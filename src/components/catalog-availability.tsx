'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ReadyHousesContext = createContext(false)

export function CatalogAvailabilityProvider({ readyHouses, children }: { readyHouses: boolean; children: ReactNode }) {
  return <ReadyHousesContext.Provider value={readyHouses}>{children}</ReadyHousesContext.Provider>
}

export function useReadyHouses() {
  return useContext(ReadyHousesContext)
}
