'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { headerTopics } from './content'
import { IconBuildingBank, IconBulb, IconCube3dSphere, IconHomeHeart, IconMoon, IconNews, IconScale, IconSearch, IconSun, IconX } from '@tabler/icons-react'
import { useTechBarTheme } from '@/components/use-tech-bar-theme'

const topicIcons = {
  news: IconNews,
  technology: IconCube3dSphere,
  mortgage: IconBuildingBank,
  law: IconScale,
  idea: IconBulb,
  'lifestile': IconHomeHeart,
} satisfies Record<(typeof headerTopics)[number]['slug'], typeof IconNews>

export function JournalHeader() {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const { theme, toggle } = useTechBarTheme()
  const ThemeIcon = theme === 'light' ? IconMoon : IconSun
  return <header className="site-header__bar journal-technical-header" data-tech-theme={theme}>
    <div className="journal-technical-inner">
      <Link href="/journal" aria-label="Главная журнала"><Image className="journal-technical-logo" src="/logo_journal.svg" alt="" width={155} height={17} unoptimized /></Link>
      <form className="journal-header-search" action={pathname.startsWith('/journal/topic/') ? pathname : '/journal'} role="search">
        <IconSearch className="journal-header-search__icon" size={16} aria-hidden />
        <input ref={searchInput} type="search" name="q" value={search} onChange={event => setSearch(event.target.value)} aria-label="Поиск по журналу" placeholder="Поиск по журналу" maxLength={100} />
        {search && (
          <button type="button" aria-label="Очистить поиск" onClick={() => {
            setSearch('')
            searchInput.current?.focus()
          }}>
            <IconX size={15} aria-hidden />
          </button>
        )}
      </form>
      <div className="journal-technical-actions">
        <Link href="/">Основной сайт</Link>
        <button type="button" onClick={toggle} aria-label={theme === 'light' ? 'Включить тёмную тему шапки' : 'Включить светлую тему шапки'}>
          <ThemeIcon size={18} aria-hidden />
        </button>
      </div>
    </div>
    <nav className="journal-header-topics" aria-label="Рубрики журнала">
      {headerTopics.map(topic => {
        const TopicIcon = topicIcons[topic.slug]
        const href = `/journal/topic/${topic.slug}`
        return <Link key={topic.slug} href={href} aria-current={pathname === href ? 'page' : undefined}>
          <span className="journal-topic-label">
            <TopicIcon size={17} stroke={1.7} aria-hidden="true" />
            {topic.title}
          </span>
        </Link>
      })}
    </nav>
  </header>
}
