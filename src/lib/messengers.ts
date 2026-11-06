export const fallbackMessengerUrls = {
  max: 'https://max.ru/avg_st',
  telegram: 'https://t.me/avgstroy',
  whatsapp: '78312666645',
} as const

export type MessengerSettings = {
  maxEnabled?: boolean | null
  maxUrl?: string | null
  telegramEnabled?: boolean | null
  telegramUrl?: string | null
  whatsappEnabled?: boolean | null
  whatsappPhone?: string | null
}

export type MessengerLinks = { max: string; telegram: string; whatsapp: string }

export function normalizeMessengerUrl(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function normalizeMessengerPhone(value: unknown) {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : ''
  return /^\d{10,15}$/.test(digits) ? digits : ''
}

export function whatsappHref(phone: string) {
  return phone ? `https://wa.me/${phone}` : ''
}

function channel(enabled: boolean | null | undefined, value: string) {
  return enabled === false ? '' : value
}

export function publicMessengers(settings: MessengerSettings) {
  const max = normalizeMessengerUrl(settings.maxUrl) || fallbackMessengerUrls.max
  const telegram = normalizeMessengerUrl(settings.telegramUrl) || fallbackMessengerUrls.telegram
  const phone = normalizeMessengerPhone(settings.whatsappPhone) || fallbackMessengerUrls.whatsapp
  return {
    max: { enabled: settings.maxEnabled !== false, href: channel(settings.maxEnabled, max) },
    telegram: { enabled: settings.telegramEnabled !== false, href: channel(settings.telegramEnabled, telegram) },
    whatsapp: { enabled: settings.whatsappEnabled !== false, phone: channel(settings.whatsappEnabled, phone), href: channel(settings.whatsappEnabled, whatsappHref(phone)) },
  }
}

export function messengerPanelValues(settings: MessengerSettings) {
  return {
    maxEnabled: settings.maxEnabled !== false,
    maxUrl: normalizeMessengerUrl(settings.maxUrl) || fallbackMessengerUrls.max,
    telegramEnabled: settings.telegramEnabled !== false,
    telegramUrl: normalizeMessengerUrl(settings.telegramUrl) || fallbackMessengerUrls.telegram,
    whatsappEnabled: settings.whatsappEnabled !== false,
    whatsappPhone: normalizeMessengerPhone(settings.whatsappPhone) || fallbackMessengerUrls.whatsapp,
  }
}

export function fallbackMessengerLinks(): MessengerLinks {
  return {
    max: fallbackMessengerUrls.max,
    telegram: fallbackMessengerUrls.telegram,
    whatsapp: whatsappHref(fallbackMessengerUrls.whatsapp),
  }
}
