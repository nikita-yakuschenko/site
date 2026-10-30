'use client'

import { useEffect, useState } from 'react'
import type { TrafficRegion } from '../lib/region-traffic'

let lookup: Promise<TrafficRegion | null> | undefined
export function useIPRegion() {
  const [region, setRegion] = useState<TrafficRegion | null>(null)
  useEffect(() => {
    let active = true
    lookup ??= fetch('/api/visitor-region', { cache: 'no-store', signal: AbortSignal.timeout(3000) })
      .then(async response => {
        if (!response.ok) return null
        const data = await response.json()
        return data.region === 'nn' || data.region === 'msk' ? data.region as TrafficRegion : null
      }).catch(() => null)
    void lookup.then(value => { if (active) setRegion(value) })
    return () => { active = false }
  }, [])
  return region
}
