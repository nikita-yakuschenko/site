export const LOCALE = 'ru-RU'
export const OG_LOCALE = 'ru_RU'
export const TIMEZONE = 'Europe/Moscow'
export const CURRENCY = 'RUB'
export const DATE_FORMAT = 'dd.MM.yyyy'
export const DATETIME_FORMAT = 'dd.MM.yyyy HH:mm'

const dateTime = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateOnly = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const money = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })

export function formatDate(value: Date | string | number): string {
  return dateOnly.format(new Date(value))
}

export function formatDateTime(value: Date | string | number): string {
  return dateTime.format(new Date(value))
}

export function formatNumber(value: number): string {
  return number.format(value)
}

export function formatRub(amount: number): string {
  return money.format(amount)
}

export const russianTimezones = [
  { label: 'Калининград', value: 'Europe/Kaliningrad' },
  { label: 'Москва', value: 'Europe/Moscow' },
  { label: 'Самара', value: 'Europe/Samara' },
  { label: 'Екатеринбург', value: 'Asia/Yekaterinburg' },
  { label: 'Омск', value: 'Asia/Omsk' },
  { label: 'Красноярск', value: 'Asia/Krasnoyarsk' },
  { label: 'Иркутск', value: 'Asia/Irkutsk' },
  { label: 'Якутск', value: 'Asia/Yakutsk' },
  { label: 'Владивосток', value: 'Asia/Vladivostok' },
  { label: 'Магадан', value: 'Asia/Magadan' },
  { label: 'Камчатка', value: 'Asia/Kamchatka' },
] as const
