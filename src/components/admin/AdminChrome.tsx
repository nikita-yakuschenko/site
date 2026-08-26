'use client'

import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import { useTheme } from '@payloadcms/ui'
import { AdminPasswordToggle } from './AdminPasswordToggle'

const CREATE_HINTS: Record<string, string> = {
  users: 'Добавить нового пользователя',
  media: 'Добавить файлы',
  pages: 'Создать новую страницу',
  sites: 'Создать новый сайт',
}

export function AdminChrome({ children }: { children: ReactNode }) {
  const { autoMode, setTheme, theme } = useTheme()

  useLayoutEffect(() => {
    document.documentElement.classList.add(GeistSans.variable)
    document.documentElement.setAttribute('data-theme', 'light')
    document.cookie = 'payload-theme=light; path=/; max-age=31536000; SameSite=Lax'
    if (theme !== 'light' || autoMode) setTheme('light')
  }, [autoMode, setTheme, theme])

  useEffect(() => {
    const apply = () => {
      for (const [slug, hint] of Object.entries(CREATE_HINTS)) {
        document
          .querySelectorAll<HTMLAnchorElement>(`#card-${slug} a[href$="/collections/${slug}/create"]`)
          .forEach((el) => {
            if (el.getAttribute('aria-label') === hint) return
            el.setAttribute('aria-label', hint)
            el.setAttribute('title', hint)
          })
      }
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div className={GeistSans.variable} style={{ display: 'contents' }}>
      {children}
      <AdminPasswordToggle />
    </div>
  )
}
