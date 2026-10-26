"use client";

import { IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'avgst:cookie-notice-dismissed'
const NOTICE_COOKIE = 'avgst_cookie_notice_dismissed'
const DISMISS_EVENT = 'avgst:cookie-notice-dismissed'
let dismissedInMemory = false

function isNoticeVisible(): boolean {
  if (dismissedInMemory) return false
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === '1') return false
  } catch {
    // Cookie остаётся запасным хранилищем, если localStorage недоступен.
  }
  try {
    if (document.cookie.split(';').some(cookie => cookie.trim() === `${NOTICE_COOKIE}=1`)) return false
  } catch {
    // Даже при запрете хранилищ закрытие действует до конца текущего визита.
  }
  return true
}

function dismissNotice(): void {
  dismissedInMemory = true
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Не мешать закрытию уведомления.
  }
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${NOTICE_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
  } catch {
    // Не мешать закрытию уведомления.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(DISMISS_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(DISMISS_EVENT, onChange)
  }
}

// До чтения хранилищ уведомление скрыто: у вернувшегося посетителя оно не мигает.
const serverVisibility = () => false

/** Informational notice only; dismissal never changes integration permissions. */
export function CookieBanner() {
  const visible = useSyncExternalStore(subscribe, isNoticeVisible, serverVisibility)

  useEffect(() => {
    if (!visible || !window.matchMedia('(max-width: 899px)').matches) return
    const timer = window.setTimeout(dismissNotice, 6000)
    return () => window.clearTimeout(timer)
  }, [visible])

  if (!visible) return null

  return (
    <div className="cookie-banner cookie-banner--notice" role="region" aria-label="Использование cookie" aria-describedby="cookie-banner-text">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__head">
          <p id="cookie-banner-text" className="cookie-banner__text">
            Мы используем cookie для работы сайта, аналитики и рекламы.{' '}
            <Link href="/cookies">Подробнее</Link>
          </p>
          <button type="button" className="cookie-banner__tune" onClick={dismissNotice} aria-label="Закрыть уведомление о cookie">
            <IconX size={16} stroke={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="cookie-banner__actions">
          <button type="button" className="cookie-banner__btn cookie-banner__btn--primary" onClick={dismissNotice}>Понятно</button>
        </div>
      </div>
    </div>
  )
}
