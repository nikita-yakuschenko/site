'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function storedTheme(): Theme {
  const saved = localStorage.getItem('ags-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function OpenDayTheme() {
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.agsTheme = storedTheme() }
    apply()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onMedia = () => { if (!localStorage.getItem('ags-theme')) apply() }
    media.addEventListener('change', onMedia)
    return () => {
      media.removeEventListener('change', onMedia)
      delete document.documentElement.dataset.agsTheme
    }
  }, [])
  return null
}

export function OpenDayThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  useEffect(() => { setTheme(storedTheme()) }, [])
  return (
    <button
      className="ags-theme-toggle"
      type="button"
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={() => {
        const next: Theme = document.documentElement.dataset.agsTheme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('ags-theme', next)
        document.documentElement.dataset.agsTheme = next
        setTheme(next)
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path className="ags-theme-sun" d="M12 4.2V2.8M12 21.2v-1.4M4.2 12H2.8M21.2 12h-1.4M6.1 6.1 5.1 5.1M18.9 18.9l-1-1M6.1 17.9l-1 1M18.9 5.1l-1 1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path className="ags-theme-moon" d="M15 3.4A8 8 0 1 0 20.6 15 6.4 6.4 0 0 1 15 3.4Z" />
      </svg>
    </button>
  )
}
