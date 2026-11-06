import { reportEvent, sanitizeClientEvent } from '../../../../../src/lib/monitoring'

export const dynamic = 'force-dynamic'

const windowStart = { at: 0, count: 0 }

function allowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return new Response(null, { status: 403 })
  const now = Date.now()
  if (now - windowStart.at > 60_000) {
    windowStart.at = now
    windowStart.count = 0
  }
  windowStart.count += 1
  if (windowStart.count > 60) return new Response(null, { status: 429 })

  const length = Number(request.headers.get('content-length') || 0)
  if (length > 12_000) return new Response(null, { status: 413 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }
  const event = sanitizeClientEvent('cms', body)
  if (!event) return new Response(null, { status: 400 })
  console.error(JSON.stringify({
    event: 'client.error',
    app: 'cms',
    type: event.type,
    message: event.message.slice(0, 300),
    url: event.url,
  }))
  await reportEvent(event)
  return new Response(null, { status: 204 })
}
