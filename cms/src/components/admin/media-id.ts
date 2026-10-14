// Media documents use a numeric primary key. Project product codes are a different identifier.
export function mediaDocumentId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return value
  if (value && typeof value === 'object' && 'id' in value) return mediaDocumentId((value as { id: unknown }).id)
  return null
}
