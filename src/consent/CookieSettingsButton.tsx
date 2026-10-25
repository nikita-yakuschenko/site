'use client'

import { useConsent } from './ConsentProvider'
import { copy } from '../lib/copy'
import { COOKIE_PROMPT_ENABLED } from './types'

/** Кнопка повторного открытия настроек — на странице политики cookie. */
export function CookieSettingsButton({
  className = 'btn btn-yellow',
}: {
  className?: string
}) {
  const { openConsentSettings } = useConsent()
  if (!COOKIE_PROMPT_ENABLED) return null
  return (
    <button type="button" className={className} onClick={openConsentSettings}>
      {copy.cookieSettings}
    </button>
  )
}
