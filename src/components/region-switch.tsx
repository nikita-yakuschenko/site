'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useConsent } from '../consent/ConsentProvider'
import { canPersistFunctional } from '../consent/functional-persist'
import { copy } from '../lib/copy'
import {
  readRegionCode,
  readServerRegionCode,
  REGIONS,
  subscribeRegion,
  writeRegionCode,
  type RegionCode,
} from '../lib/regions'

export function RegionSwitch() {
  const { openConsentSettings } = useConsent()
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const code = useSyncExternalStore(subscribeRegion, readRegionCode, readServerRegionCode)
  const current = REGIONS.find((region) => region.code === code) || REGIONS[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function select(next: RegionCode): void {
    if (!canPersistFunctional()) {
      openConsentSettings()
      setOpen(false)
      return
    }
    writeRegionCode(next)
    setOpen(false)
  }

  return (
    <div className="site-region" ref={root}>
      <button
        type="button"
        className="site-region__trigger"
        aria-label={`${copy.regionChoose}: ${current.name}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img className={`site-region__mark site-region__mark--${current.tone}`} src={current.mark} alt="" width={18} height={24} />
        <span className="site-region__name">
          <span className="site-region__sizer" aria-hidden="true">
            {REGIONS.map((region) => (
              <span key={region.code}>{region.name}</span>
            ))}
          </span>
          <span className="site-region__label">{current.name}</span>
        </span>
        {/* Шеврона нет: подчёркивание названия города уже говорит, что сюда
            можно нажать, а стрелка повторяла то же самое второй раз. */}
      </button>

      {open ? (
        <ul className="site-region__menu" role="listbox" aria-label={copy.regionChoose}>
          {REGIONS.map((region) => (
            <li key={region.code} role="none">
              <button
                type="button"
                role="option"
                className="site-region__option"
                aria-selected={region.code === current.code}
                onClick={() => select(region.code)}
              >
                <img className={`site-region__mark site-region__mark--${region.tone}`} src={region.mark} alt="" width={22} height={30} />
                <span className="site-region__option-name">{region.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
