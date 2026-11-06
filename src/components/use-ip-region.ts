'use client'

import { useEffect, useState } from 'react'
import type { TrafficRegion } from '../lib/region-traffic'

function confirmedRegion(value: unknown): TrafficRegion | null {
  return value === 'nn' || value === 'msk' ? value : null
}

// A fresh request every time: Safari can keep the previous JSON, and a restored tab keeps the previous line.
function askRegion(): Promise<TrafficRegion | null> {
  return fetch(`/api/visitor-region?t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    .then(async response => confirmedRegion(response.ok ? (await response.json())?.region : null))
    .catch(() => null)
}

export function useIPRegion() {
  const [region, setRegion] = useState<TrafficRegion | null>(null)
  useEffect(() => {
    let active = true
    let ticket = 0
    const apply = () => {
      const mine = ++ticket
      void askRegion().then(value => { if (active && mine === ticket) setRegion(value) })
    }
    apply()
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) apply() }
    const onVisible = () => { if (document.visibilityState === 'visible') apply() }
    window.addEventListener('pageshow', onShow)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.removeEventListener('pageshow', onShow)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return region
}
