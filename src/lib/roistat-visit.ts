/** Номер выдаёт Roistat; не создаём и не подменяем его самостоятельно. */
export function readRoistatVisit(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const cookie = document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith('roistat_visit='))?.slice('roistat_visit='.length)
  const sdk = (window as Window & { roistat?: { getVisit?: () => unknown } }).roistat
  let value: unknown = cookie
  if (!value) {
    try { value = sdk?.getVisit?.() } catch { return undefined }
  }
  return /^\d{1,64}$/.test(String(value ?? '')) ? String(value) : undefined
}

export async function waitForRoistatVisit(timeoutMs = 3000): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined
  const deadline = Date.now() + timeoutMs
  do {
    const visit = readRoistatVisit()
    if (visit) return visit
    if (Date.now() >= deadline) return undefined
    await new Promise(resolve => setTimeout(resolve, 50))
  } while (true)
}
