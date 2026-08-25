export function generatePreviewUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const normalized = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams({
    path: normalized,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })
  return `${base}/next/preview?${params.toString()}`
}

export function isPreviewSecretValid(secret: string | null): boolean {
  const expected = process.env.PREVIEW_SECRET || ''
  return Boolean(expected) && secret === expected
}
