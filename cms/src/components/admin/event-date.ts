export function zonedParts(value: string, timeZone: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]))
}

export function wallTimeToISO(year: number, month: number, day: number, hours: number, minutes: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day, hours, minutes)
  let instant = target
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(instant).toISOString(), timeZone)!
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    instant += target - shown
  }
  return new Date(instant).toISOString()
}
