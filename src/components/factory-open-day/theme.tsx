'use client'

import { IconMoon, IconSun } from '@tabler/icons-react'
import { useEffect, useSyncExternalStore } from 'react'

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

function subscribeTheme(notify: () => void) {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ags-theme'] })
  window.addEventListener('storage', notify)
  return () => { observer.disconnect(); window.removeEventListener('storage', notify) }
}

export function OpenDayThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, storedTheme, () => 'dark' as Theme)
  return (
    <button
      className="ags-theme-toggle"
      type="button"
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={() => {
        const next: Theme = document.documentElement.dataset.agsTheme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('ags-theme', next)
        document.documentElement.dataset.agsTheme = next
      }}
    >
      <IconMoon className="ags-theme-moon" size={18} stroke={2} aria-hidden />
      <IconSun className="ags-theme-sun" size={18} stroke={2} aria-hidden />
    </button>
  )
}
