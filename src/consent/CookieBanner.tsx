'use client'

import { IconSettings } from '@tabler/icons-react'
import Link from 'next/link'
import { useConsent } from './ConsentProvider'

export function CookieBanner() {
  const {
    ready,
    decided,
    settingsOpen,
    acceptAll,
    acceptNecessaryOnly,
    openConsentSettings,
  } = useConsent()

  if (!ready || decided || settingsOpen) return null

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-label="Настройки файлов cookie"
      aria-describedby="cookie-banner-text"
    >
      <div className="cookie-banner__inner">
        <div className="cookie-banner__head">
          <p id="cookie-banner-text" className="cookie-banner__text">
            Мы используем cookie для работы сайта. Остальные категории только с
            вашего согласия.{' '}
            <Link href="/cookies">Подробнее</Link>
          </p>
          <button
            type="button"
            className="cookie-banner__tune"
            onClick={openConsentSettings}
            aria-label="Настроить"
            title="Настроить"
          >
            <IconSettings size={16} stroke={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--primary"
            onClick={acceptAll}
          >
            Принять все
          </button>
          <button
            type="button"
            className="cookie-banner__btn"
            onClick={acceptNecessaryOnly}
          >
            Необходимые
          </button>
        </div>
      </div>
    </div>
  )
}
