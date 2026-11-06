export type MonitoringApp = 'site' | 'cms'
export type MonitoringLevel = 'fatal' | 'error' | 'warning' | 'info'

export type MonitoringEvent = {
  source: 'server' | 'client'
  app: MonitoringApp
  level?: MonitoringLevel
  message: string
  stack?: string
  type?: string
  url?: string
  route?: string
  method?: string
  extra?: Record<string, unknown>
}

type ParsedDsn = { ingest: string; key: string }

const recent = new Map<string, number>()

export function parseSentryDsn(raw: string | undefined): ParsedDsn | null {
  const value = raw?.trim()
  if (!value) return null
  try {
    const url = new URL(value)
    const key = decodeURIComponent(url.username)
    const projectId = url.pathname.replace(/^\//, '').split('/')[0]
    if (!key || !/^[a-zA-Z0-9]+$/.test(key) || !projectId || !/^\d+$/.test(projectId)) return null
    return { ingest: `${url.protocol}//${url.host}/api/${projectId}/envelope/`, key }
  } catch {
    return null
  }
}

function throttle(key: string, ms: number) {
  const now = Date.now()
  const previous = recent.get(key) ?? 0
  if (now - previous < ms) return false
  recent.set(key, now)
  if (recent.size > 400) {
    for (const [item, at] of recent) if (now - at > ms) recent.delete(item)
  }
  return true
}

function frames(stack: string) {
  const parsed = stack.split('\n').slice(0, 40).flatMap((line) => {
    const match = /^\s*at (?:(.+?) )?\(?(.*?):(\d+):(\d+)\)?$/.exec(line)
    if (!match) return []
    const filename = match[2]
    return [{
      function: match[1] || '?',
      filename,
      lineno: Number(match[3]),
      colno: Number(match[4]),
      in_app: !filename.includes('node_modules') && !filename.includes('node:'),
    }]
  })
  return parsed.reverse()
}

function envelopeFor(event: MonitoringEvent) {
  const eventId = crypto.randomUUID().replace(/-/g, '')
  const level = event.level ?? 'error'
  const release = process.env.APP_COMMIT ?? process.env.CMS_REVISION ?? process.env.APP_BUILD_ID ?? 'unknown'
  const stackFrames = event.stack ? frames(event.stack) : []
  const body = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: event.source === 'client' ? 'javascript' : 'node',
    level,
    logger: event.app,
    environment: process.env.NODE_ENV ?? 'production',
    release,
    transaction: event.route ?? event.url,
    request: event.url || event.method ? { url: event.url, method: event.method } : undefined,
    exception: {
      values: [{
        type: event.type ?? 'Error',
        value: event.message.slice(0, 2000),
        stacktrace: stackFrames.length ? { frames: stackFrames } : undefined,
      }],
    },
    extra: { ...event.extra, ...(stackFrames.length || !event.stack ? {} : { stack: event.stack.slice(0, 8000) }) },
    tags: { source: event.source, app: event.app },
  }
  return [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }),
    JSON.stringify({ type: 'event', content_type: 'application/json' }),
    JSON.stringify(body),
  ].join('\n')
}

export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chat = process.env.TELEGRAM_CHAT_ID?.trim()
  if (!token || !chat) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3500), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => undefined)
}

export async function reportEvent(event: MonitoringEvent) {
  const dsn = parseSentryDsn(process.env.SENTRY_DSN)
  if (dsn && throttle(`gt:${event.app}:${event.message.slice(0, 120)}`, 10_000)) {
    await fetch(dsn.ingest, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=avgst-monitoring/1.0, sentry_key=${dsn.key}`,
      },
      body: envelopeFor(event),
      signal: AbortSignal.timeout(3000),
    }).catch(() => undefined)
  }

  const level = event.level ?? 'error'
  if (event.source === 'server' && (level === 'error' || level === 'fatal') && throttle(`tg:${event.app}:${event.message.slice(0, 180)}`, 120_000)) {
    const route = event.route ?? event.url ?? ''
    await notifyTelegram(`[${event.app}] ${event.message.slice(0, 500)}${route ? `\n${route}` : ''}`)
  }
}

export function sanitizeClientEvent(app: MonitoringApp, input: unknown): MonitoringEvent | null {
  if (!input || typeof input !== 'object') return null
  const body = input as Record<string, unknown>
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message || message.length > 2000) return null
  const extra = body.extra && typeof body.extra === 'object' && !Array.isArray(body.extra)
    ? Object.fromEntries(Object.entries(body.extra as Record<string, unknown>).slice(0, 20).map(([key, value]) => [key, typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : String(value).slice(0, 200)]))
    : undefined
  const level = body.level === 'warning' || body.level === 'info' || body.level === 'fatal' || body.level === 'error' ? body.level : 'error'
  return {
    source: 'client',
    app,
    level,
    message,
    stack: typeof body.stack === 'string' ? body.stack.slice(0, 8000) : undefined,
    type: typeof body.type === 'string' ? body.type.slice(0, 80) : undefined,
    url: typeof body.url === 'string' ? body.url.slice(0, 500) : undefined,
    extra,
  }
}
