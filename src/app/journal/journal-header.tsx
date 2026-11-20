'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { articleTopics, headerTopics } from './content'
import { IconChevronDown, IconMoon, IconSearch, IconSun, IconX } from '@tabler/icons-react'
import { useTechBarTheme } from '@/components/use-tech-bar-theme'
import { topicIcons } from './topic-icons'

export function JournalHeader() {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const [articlesOpen, setArticlesOpen] = useState(false)
  const articlesTrigger = useRef<HTMLButtonElement>(null)
  const articlesMenu = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!articlesOpen) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !articlesTrigger.current?.contains(event.target) && !articlesMenu.current?.contains(event.target)) {
        setArticlesOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setArticlesOpen(false)
        articlesTrigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [articlesOpen])
  useEffect(() => {
    const trigger = articlesTrigger.current
    const menu = articlesMenu.current
    const row = trigger?.parentElement
    if (!trigger || !menu || !row) return
    const syncPosition = () => {
      const bounds = trigger.getBoundingClientRect()
      const offset = bounds.left - row.getBoundingClientRect().left
      menu.style.insetInlineStart = `${Math.max(0, Math.min(offset, row.clientWidth - bounds.width))}px`
      menu.style.width = `${bounds.width}px`
    }
    const observer = new ResizeObserver(syncPosition)
    observer.observe(row)
    observer.observe(trigger)
    row.addEventListener('scroll', syncPosition, { passive: true })
    syncPosition()
    return () => {
      observer.disconnect()
      row.removeEventListener('scroll', syncPosition)
    }
  }, [])
  const { theme, toggle } = useTechBarTheme()
  const ThemeIcon = theme === 'light' ? IconMoon : IconSun
  return <header className="site-header__bar journal-technical-header" data-tech-theme={theme}>
    <div className="journal-technical-inner">
      <Link href="/journal" aria-label="Главная журнала"><Image className="journal-technical-logo" src="/logo_journal.svg" alt="" width={155} height={17} unoptimized /></Link>
      <form className="journal-header-search" action={pathname.startsWith('/journal/topic/') ? pathname : '/journal'} role="search">
        <IconSearch className="journal-header-search__icon" size={16} aria-hidden />
        <input ref={searchInput} type="search" name="q" value={search} onChange={event => setSearch(event.target.value)} aria-label="Поиск статей" placeholder="Поиск статей" maxLength={100} />
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
    <nav className="journal-topic-navigation" aria-label="Рубрики журнала">
      <div className="journal-header-topics">
      {headerTopics.map(topic => {
        const TopicIcon = topicIcons[topic.slug]
        const href = topic.slug === 'news' ? '/journal' : `/journal/topic/${topic.slug}`
        if (topic.slug === 'articles') {
          return <button key={topic.slug} ref={articlesTrigger} type="button" aria-expanded={articlesOpen} aria-controls="journal-article-topics" onClick={() => setArticlesOpen(open => !open)}>
            <span className="journal-topic-label"><TopicIcon size={17} stroke={1.7} aria-hidden="true" />{topic.title}<IconChevronDown className="journal-article-chevron" size={14} aria-hidden="true" /></span>
          </button>
        }
        return <Link key={topic.slug} href={href} aria-current={pathname === href ? 'page' : undefined}>
          <span className="journal-topic-label">
            <TopicIcon size={17} stroke={1.7} aria-hidden="true" />
            {topic.title}
          </span>
        </Link>
      })}
      </div>
      <div ref={articlesMenu} id="journal-article-topics" className="journal-article-topics" data-open={articlesOpen} inert={!articlesOpen}>
        {articleTopics.map(topic => {
          const href = `/journal/topic/${topic.slug}`
          const TopicIcon = topicIcons[topic.slug]
          return <Link key={topic.slug} href={href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setArticlesOpen(false)}>
            <span className="journal-topic-label"><TopicIcon size={17} stroke={1.7} aria-hidden="true" />{topic.title}</span>
          </Link>
        })}
      </div>
    </nav>
  </header>
}
