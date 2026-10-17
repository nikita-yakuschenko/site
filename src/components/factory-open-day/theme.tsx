'use client'

import { IconMoon, IconSun } from '@tabler/icons-react'
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
      <IconMoon className="ags-theme-moon" size={24} stroke={2} aria-hidden />
      <IconSun className="ags-theme-sun" size={24} stroke={2} aria-hidden />
    </button>
  )
}
