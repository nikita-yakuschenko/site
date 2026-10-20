"use client";

import { createContext, Suspense, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { applyRegionFromSearch, readRegionCode, subscribeRegion, type RegionCode } from '../lib/regions';

/** Начальный регион из конкретного серверного запроса, без общих SSR-переменных. */
const InitialRegion = createContext<RegionCode>('nn');
export function useRegionCode(): RegionCode {
  const initial = useContext(InitialRegion);
  return useSyncExternalStore(subscribeRegion, readRegionCode, () => initial);
}
function RegionTrafficSync() {
  const search = useSearchParams().toString();
  useEffect(() => { applyRegionFromSearch(search); }, [search]);
  return null;
}
export function RegionBootstrap({ region, children }: { region: RegionCode; children: ReactNode }) {
  return <InitialRegion.Provider value={region}>
    <Suspense fallback={null}><RegionTrafficSync /></Suspense>
    {children}
  </InitialRegion.Provider>;
}
