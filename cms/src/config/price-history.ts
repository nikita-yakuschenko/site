export type PriceHistoryEntry = { date: string; amount: number }

export function moscowDate(value: Date | string = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}

export function readPriceHistory(value: unknown): PriceHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const date = 'date' in entry && typeof entry.date === 'string' ? entry.date : ''
    const amount = 'amount' in entry && typeof entry.amount === 'number' ? entry.amount : 0
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isSafeInteger(amount) || amount <= 0) return []
    return [{ date, amount }]
  })
}

// Пустая история не заполняется задним числом, пока сумма не изменилась.
export function nextPriceHistory(current: unknown, previousPrice: number | null, previousAt: string | null, nextPrice: number): PriceHistoryEntry[] {
  const history = readPriceHistory(current)
  if (!history.length && previousPrice === nextPrice) return history
  if (!history.length && previousPrice) history.push({ date: moscowDate(previousAt || new Date()), amount: previousPrice })
  if (history.at(-1)?.amount !== nextPrice) history.push({ date: moscowDate(), amount: nextPrice })
  return history
}
