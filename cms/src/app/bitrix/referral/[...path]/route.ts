import { GET as handleGet, POST as handlePost } from '../../../api/automation/[action]/route'
import { getPayload } from 'payload'
import config from '@payload-config'
import { enqueue, settings } from '../../../../automation/store'
import { equalSecret } from '../../../../automation/crypto'
import { eventBySlug } from '../../../../automation/registrations'
type Context = { params: Promise<{ path: string[] }> }
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: Context) {
  const { path } = await context.params
  const action = path.join('/') === 'confirm' ? 'confirm' : path.join('/') === 'event.ics' ? 'calendar' : ''
  if (path.join('/') === 'health') return Response.json({ ok: true, service: 'cms-automation' })
  if (!action) return Response.json({ error: 'Не найдено' }, { status: 404 })
  return handleGet(request, { params: Promise.resolve({ action }) })
}
export async function POST(request: Request, context: Context) {
  const { path } = await context.params
  const route = path.join('/')
  if (route === 'webhook/bitrix') return handlePost(request, { params: Promise.resolve({ action: 'referral-webhook' }) })
  if (!['api/referral/start', 'api/event/remind'].includes(route)) return Response.json({ error: 'Не найдено' }, { status: 404 })
  const payload = await getPayload({ config }), saved = await settings(payload), secret = saved.secret('tokenSecret')
  if (!secret || !equalSecret(request.headers.get('x-webhook-secret') || '', secret)) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  try {
    const body = await request.json()
    if (route === 'api/referral/start') {
      const id = String(body.entity_id || body.entityId || '')
      if (!/^\d+$/.test(id)) return Response.json({ error: 'entity_id required' }, { status: 400 })
      await enqueue(payload, 'crm-registration', { dealId: id, force: true })
      return Response.json({ ok: true, accepted: true }, { status: 202 })
    }
    const event = await eventBySlug(payload, 'factory-open-day')
    if (event.status !== 'published') return Response.json({ error: 'Мероприятие не опубликовано' }, { status: 409 })
    const rows = await payload.find({ collection: 'event-registrations', where: { and: [{ eventSlug: { equals: event.slug } }, { status: { equals: 'confirmed' } }, { email: { exists: true } }] }, pagination: false, overrideAccess: true })
    if (body.dry_run === true) return Response.json({ ok: true, dry_run: true, recipients: rows.totalDocs })
    for (const row of rows.docs) await enqueue(payload, 'email', { flow: 'event', recordId: row.id, template: 'reminder' }, `reminder:${event.id}:${event.startsAt}:${row.id}`)
    return Response.json({ ok: true, queued: rows.totalDocs }, { status: 202 })
  } catch { return Response.json({ error: 'Не удалось обработать запрос' }, { status: 400 }) }
}
