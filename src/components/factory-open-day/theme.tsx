'use client'

import { useEffect } from 'react'

// Палитра страницы следует системе, как на исходной посадке.
export function OpenDayTheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { document.documentElement.dataset.agsTheme = media.matches ? 'dark' : 'light' }
    apply()
    media.addEventListener('change', apply)
    return () => {
      media.removeEventListener('change', apply)
      delete document.documentElement.dataset.agsTheme
    }
  }, [])
  return null
}
