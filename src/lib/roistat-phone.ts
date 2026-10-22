export function phoneDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `7${digits}` : digits.replace(/^8(?=\d{10}$)/, '7')
}

/** Используем только назначение, сохранённое самим SDK Roistat. */
export function assignedPhone(raw: string, original: string): string | undefined {
  try {
    const rows: unknown = JSON.parse(raw.startsWith('[') ? raw : decodeURIComponent(raw))
    if (!Array.isArray(rows)) return undefined
    for (const row of rows) {
      if (!row || typeof row !== 'object' || !Array.isArray(row.replaceable_numbers)) continue
      if (!row.replaceable_numbers.some((number: unknown) => typeof number === 'string' && phoneDigits(number) === phoneDigits(original))) continue
      if (typeof row.phone === 'string' && /^7\d{10}$/.test(phoneDigits(row.phone))) return row.phone
    }
  } catch { /* Некорректная cookie не подменяет номер. */ }
  return undefined
}
