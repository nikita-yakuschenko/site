import { readConsentCookie } from '../consent/storage'
import { hasConsent, isConsentDecided } from '../consent/types'

export const VK_PIXEL_ID = '3807543'
// Этот же идентификатор нужно указать в цели рекламного кабинета VK.
export const VK_FORM_GOAL = 'GOAL_NAME'

type VkEvent =
  | { id: string; type: 'pageView'; start: number; url: string }
  | { id: number; type: 'reachGoal'; goal: string }

declare global {
  interface Window {
    _tmr?: { push: (event: VkEvent) => unknown }
  }
}

let lastPage: string | undefined
const trackedRequests = new Set<string>()

function allowed(): boolean {
  if (typeof window === 'undefined') return false
  const consent = readConsentCookie()
  return isConsentDecided(consent) && hasConsent(consent, 'marketing')
}

export function trackVkPageView(): void {
  try {
    if (!allowed()) return
    const url = window.location.href
    if (lastPage === url) return
    const queue = window._tmr || (window._tmr = [] as VkEvent[])
    queue.push({ id: VK_PIXEL_ID, type: 'pageView', start: Date.now(), url })
    if (!document.getElementById('tmr-code')) {
      const script = document.createElement('script')
      script.id = 'tmr-code'
      script.async = true
      script.src = 'https://top-fwz1.mail.ru/js/code.js'
      document.head.appendChild(script)
    }
    lastPage = url
  } catch {
    // Блокировщик рекламы не должен влиять на сайт и отправку заявок.
  }
}

export function revokeVkPixel(): void {
  lastPage = undefined
}

/** Только подтверждённая заявка, один раз на ключ попытки, без данных формы. */
export function trackVkFormSubmit(requestId: string): void {
  try {
    if (!allowed() || trackedRequests.has(requestId)) return
    trackVkPageView()
    window._tmr?.push({ type: 'reachGoal', id: Number(VK_PIXEL_ID), goal: VK_FORM_GOAL })
    trackedRequests.add(requestId)
  } catch {
    // Ошибка аналитики не должна превращать принятую заявку в ошибку формы.
  }
}
