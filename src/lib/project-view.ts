const viewedKey = 'avgst-session-views'
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function viewedSlugs() {
  try {
    const value = JSON.parse(sessionStorage.getItem(viewedKey) || '[]') as unknown
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function claim(slug: string) {
  const viewed = viewedSlugs()
  if (viewed.includes(slug)) return false
  viewed.push(slug)
  sessionStorage.setItem(viewedKey, JSON.stringify(viewed))
  return true
}

function release(slug: string) {
  try { sessionStorage.setItem(viewedKey, JSON.stringify(viewedSlugs().filter(item => item !== slug))) } catch { /* Хранилище сессии закрыто. */ }
}

// Один просмотр проекта на сессию вкладки. Повторный заход в той же сессии не считается.
export async function recordSessionView(slug: string) {
  if (typeof window === 'undefined' || !slugPattern.test(slug)) return
  if (new URLSearchParams(window.location.search).get('cmsPreview') === '1') return
  if (!claim(slug)) return
  const response = await fetch('/api/views', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }), keepalive: true }).catch(() => null)
  if (!response?.ok) release(slug)
}

export async function recordCardShare(slug: string) {
  if (!slugPattern.test(slug) || new URLSearchParams(window.location.search).get('cmsPreview') === '1') return
  await fetch('/api/reactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      action: 'share',
      signals: {
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${window.screen.width}x${window.screen.height}x${window.devicePixelRatio || 1}`,
        lang: navigator.language,
        cores: navigator.hardwareConcurrency,
      },
    }),
  }).catch(() => null)
  await recordSessionView(slug)
}
