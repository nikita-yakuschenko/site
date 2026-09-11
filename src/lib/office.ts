import { copy } from './copy'

/**
 * Режим работы офиса.
 *
 * Время считается в часовом поясе офиса, а не посетителя: клиент из
 * Владивостока не должен видеть «офис открыт», когда в Нижнем Новгороде ночь.
 */
export const OFFICE_TIMEZONE = 'Europe/Moscow'

/** За сколько минут до открытия и закрытия предупреждаем. */
const SOON_MINUTES = 30

export type OfficeStatus = 'open' | 'soon-open' | 'soon-close' | 'closed' | 'unknown'

export type ScheduleRow = {
  key: 'weekdays' | 'saturday' | 'sunday'
  label: string
  /** Дни недели по нумерации Date: 0 — воскресенье. */
  days: readonly number[]
  /** Минуты от полуночи. null — приём только по договорённости. */
  from: number | null
  to: number | null
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes

export const OFFICE_SCHEDULE: readonly ScheduleRow[] = [
  { key: 'weekdays', label: copy.officeWeekdays, days: [1, 2, 3, 4, 5], from: h(9), to: h(20) },
  { key: 'saturday', label: copy.officeSaturday, days: [6], from: h(10), to: h(18) },
  { key: 'sunday', label: copy.officeSunday, days: [0], from: null, to: null },
]

export function formatRange(row: ScheduleRow): string {
  if (row.from === null || row.to === null) return copy.officeByArrangement
  const hhmm = (value: number) =>
    `${String(Math.floor(value / 60)).padStart(2, '0')}.${String(value % 60).padStart(2, '0')}`
  return `${hhmm(row.from)} – ${hhmm(row.to)}`
}

// Часовой пояс офиса берём через Intl, а не сдвигом на три часа: смещение
// зависит от даты, и руками его лучше не воспроизводить.
const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: OFFICE_TIMEZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function officeClock(date: Date): { day: number; minutes: number } | null {
  const parts = partsFormat.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  const weekday = get('weekday')
  const hour = get('hour')
  const minute = get('minute')
  if (weekday === undefined || hour === undefined || minute === undefined) return null
  const day = WEEKDAY_INDEX[weekday]
  if (day === undefined) return null
  // В некоторых средах полночь приходит как «24».
  return { day, minutes: (Number(hour) % 24) * 60 + Number(minute) }
}

export function rowForDay(day: number): ScheduleRow | null {
  return OFFICE_SCHEDULE.find((row) => row.days.includes(day)) ?? null
}

export function officeStatusAt(date: Date): OfficeStatus {
  const clock = officeClock(date)
  if (!clock) return 'unknown'
  const row = rowForDay(clock.day)
  if (!row || row.from === null || row.to === null) return 'closed'
  const { minutes } = clock
  if (minutes >= row.to) return 'closed'
  if (minutes >= row.to - SOON_MINUTES) return 'soon-close'
  if (minutes >= row.from) return 'open'
  if (minutes >= row.from - SOON_MINUTES) return 'soon-open'
  return 'closed'
}

export function statusLabel(status: OfficeStatus): string {
  if (status === 'open') return copy.officeOpen
  if (status === 'soon-open') return copy.officeSoonOpen
  if (status === 'soon-close') return copy.officeSoonClose
  if (status === 'closed') return copy.officeClosed
  return copy.officeHours
}

/**
 * Источник для useSyncExternalStore: статус зависит от времени, то есть
 * является внешним по отношению к React состоянием. Так компонент обходится
 * без setState в эффекте и не расходится между сервером и клиентом.
 */
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
let snapshot: OfficeStatus = 'unknown'

function refresh(): void {
  const next = officeStatusAt(new Date())
  if (next === snapshot) return
  snapshot = next
  for (const listener of listeners) listener()
}

export function subscribeOfficeStatus(listener: () => void): () => void {
  listeners.add(listener)
  if (!timer) {
    refresh()
    // Полминуты достаточно: пороги заданы с точностью до минуты.
    timer = setInterval(refresh, 30_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

export function readOfficeStatus(): OfficeStatus {
  if (typeof window === 'undefined') return 'unknown'
  if (!timer) snapshot = officeStatusAt(new Date())
  return snapshot
}

/** На сервере времени посетителя ещё нет — отдаём нейтральное состояние. */
export function readServerOfficeStatus(): OfficeStatus {
  return 'unknown'
}
