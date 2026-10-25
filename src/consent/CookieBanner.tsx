"use client";

import { IconX } from '@tabler/icons-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/** Informational notice only; dismissal never changes integration permissions. */
export function CookieBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(max-width: 899px)').matches) return
    const timer = window.setTimeout(() => setDismissed(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  if (dismissed) return null

  return (
    <div className="cookie-banner cookie-banner--notice" role="region" aria-label="Использование cookie" aria-describedby="cookie-banner-text">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__head">
          <p id="cookie-banner-text" className="cookie-banner__text">
            Мы используем cookie для работы сайта, аналитики и рекламы.{' '}
            <Link href="/cookies">Подробнее</Link>
          </p>
          <button type="button" className="cookie-banner__tune" onClick={() => setDismissed(true)} aria-label="Закрыть уведомление о cookie">
            <IconX size={16} stroke={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="cookie-banner__actions">
          <button type="button" className="cookie-banner__btn cookie-banner__btn--primary" onClick={() => setDismissed(true)}>Понятно</button>
        </div>
      </div>
    </div>
  )
}
