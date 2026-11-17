'use client'

import Link from 'next/link'
import Image from 'next/image'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { useTechBarTheme } from '@/components/use-tech-bar-theme'

export function JournalHeader() {
  const { theme, toggle } = useTechBarTheme()
  const ThemeIcon = theme === 'light' ? IconMoon : IconSun
  return <header className="site-header__bar journal-technical-header" data-tech-theme={theme}>
    <div className="journal-technical-inner">
      <Link href="/journal" aria-label="Главная журнала"><Image className="journal-technical-logo" src="/logo_journal.svg" alt="" width={155} height={17} unoptimized /></Link>
      <div className="journal-technical-actions">
        <Link href="/">Основной сайт</Link>
        <button type="button" onClick={toggle} aria-label={theme === 'light' ? 'Включить тёмную тему шапки' : 'Включить светлую тему шапки'}>
          <ThemeIcon size={18} aria-hidden />
        </button>
      </div>
    </div>
  </header>
}
