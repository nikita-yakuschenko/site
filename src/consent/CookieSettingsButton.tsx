'use client'

import { useConsent } from './ConsentProvider'
import { copy } from '../lib/copy'

/** Кнопка повторного открытия настроек — на странице политики cookie. */
export function CookieSettingsButton({
  className = 'btn btn-yellow',
}: {
  className?: string
}) {
  const { openConsentSettings } = useConsent()
  return (
    <button type="button" className={className} onClick={openConsentSettings}>
      {copy.cookieSettings}
    </button>
  )
}
