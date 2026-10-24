import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { randomUUID } from 'node:crypto'
import { activeStaff } from '../../../../access/staff'
import { enqueue, saveSettings, settings } from '../../../../automation/store'
import { equalSecret } from '../../../../automation/crypto'
import { calendar } from '../../../../automation/calendar'
import { collectionFor, confirmToken, eventBySlug } from '../../../../automation/registrations'
import { validateSettings } from '../../../../automation/validation'
import { BitrixClient } from '../../../../automation/bitrix'
import { importCrm } from '../../../../automation/import'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
type Context = { params: Promise<{ action: string }> }
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
async function staff(request: Request, payload: Awaited<ReturnType<typeof getPayload>>) {
  const auth = await payload.auth({ headers: request.headers })
  const req = await createLocalReq({ user: auth.user || undefined }, payload)
  return activeStaff(req)
}
export async function GET(request: Request, context: Context) {
  const { action } = await context.params, payload = await getPayload({ config }), url = new URL(request.url)
  try {
    if (action === 'confirm') {
      await confirmToken(payload, url.searchParams.get('token') || '')
      return new Response('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Регистрация подтверждена</title><body style="font:18px system-ui;max-width:560px;margin:12vh auto;padding:24px"><h1>Регистрация подтверждена</h1><p>Спасибо! Письмо с подробностями придёт на ваш email.</p><a href="https://avgst.ru">На сайт Авангард Строй</a></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
    }
    if (action === 'calendar') {
      const event = await eventBySlug(payload, url.searchParams.get('event') || 'factory-open-day')
      if (event.status === 'draft') return json({ error: 'Не найдено' }, 404)
      return new Response(calendar(event), { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="event.ics"' } })
    }
    if (action === 'event') {
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
      if (!process.env.CMS_SITE_API_KEY || !equalSecret(token, process.env.CMS_SITE_API_KEY)) return json({ error: 'Нет доступа' }, 401)
      const event = await eventBySlug(payload, url.searchParams.get('slug') || 'factory-open-day')
      if (event.status === 'draft') return json({ error: 'Не найдено' }, 404)
      const { title, slug, startsAt, endsAt, timezone, description, programme, address, landmark, latitude, longitude, markerLabel, routeUrl, phone, registrationEnabled, status } = event
      return json({ title, slug, startsAt, endsAt, timezone, description, programme, address, landmark, latitude, longitude, markerLabel, routeUrl, phone, registrationEnabled, status })
    }
    const user = await staff(request, payload)
    if (!user) return json({ error: 'Нет доступа' }, 401)
    if (action === 'settings') {
      if (user.role !== 'super-admin') return json({ error: 'Нужны права администратора' }, 403)
      const saved = await settings(payload)
      return json({ config: saved.config, configured: Object.fromEntries(Object.keys(saved.vault).map(k => [k, true])), cutover: saved.cutover })
    }
    return json({ error: 'Не найдено' }, 404)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Ошибка' }, 400) }
}
export async function POST(request: Request, context: Context) {
  const { action } = await context.params, payload = await getPayload({ config })
  try {
    if (action === 'dmp' || action === 'referral-webhook') {
      const saved = await settings(payload)
      const raw: Record<string, unknown> = request.headers.get('content-type')?.includes('application/json') ? await request.json() : Object.fromEntries(new URLSearchParams(await request.text()))
      const auth = raw.auth as Record<string, unknown> | undefined
      const token = String(raw['auth[application_token]'] || auth?.application_token || raw.application_token || '')
      const expected = saved.secret(action === 'dmp' ? 'dmpAppTokens' : 'bitrixAppToken').split(/[\s,]+/).filter(Boolean)
      if (!expected.length || !expected.some(s => equalSecret(s, token))) return json({ error: 'Нет доступа' }, 401)
      const domain = String(raw['auth[domain]'] || auth?.domain || '')
      if (domain !== saved.config.crm.domain) return json({ error: 'Неверный портал' }, 403)
      const event = String(raw.event || '').toUpperCase()
      if (!['ONCRMDEALADD', 'ONCRMDEALUPDATE'].includes(event)) return json({ accepted: true, ignored: true })
      const fields = (raw.data as { FIELDS?: { ID?: unknown } } | undefined)?.FIELDS
      const id = String(raw['data[FIELDS][ID]'] || fields?.ID || '')
      if (!/^\d+$/.test(id)) return json({ error: 'Не указан ID сделки' }, 400)
      await enqueue(payload, action === 'dmp' ? 'dmp' : 'crm-registration', { dealId: id }, `${action}:${id}:${randomUUID()}`)
      return json({ accepted: true }, 202)
    }
    // Cookie authentication alone is insufficient for state-changing custom routes.
    if (request.headers.get('origin') !== new URL(process.env.CMS_PUBLIC_URL || request.url).origin) return json({ error: 'Недопустимый источник запроса' }, 403)
    const user = await staff(request, payload)
    if (!user || user.role !== 'super-admin') return json({ error: 'Нужны права администратора' }, 403)
    const body = await request.json() as Record<string, unknown>
    if (action === 'settings') {
      const section = String(body.section)
      if (!['referral', 'mail', 'dmp'].includes(section)) return json({ error: 'Укажите раздел настроек' }, 400)
      const saved = await settings(payload), incoming = body.config as Record<string, unknown>
      const next = validateSettings({ ...saved.config, [section]: incoming[section], ...(section === 'referral' ? { crm: incoming.crm } : {}) }), secrets = (body.secrets || {}) as Record<string, string>
      const allowed = ['smtpPassword', 'bitrixWebhook', 'dmpWebhook', 'bitrixAppToken', 'dmpAppTokens', 'tokenSecret']
      if (Object.entries(secrets).some(([k, v]) => !allowed.includes(k) || typeof v !== 'string')) return json({ error: 'Неизвестный секрет' }, 400)
      for (const key of ['bitrixWebhook', 'dmpWebhook']) if (secrets[key]) new BitrixClient(secrets[key], next.crm.domain)
      await saveSettings(payload, next, secrets)
      return json({ saved: true })
    }
    if (action === 'import') return json(await importCrm(payload))
    if (action === 'registration-email') {
      if (!['referral', 'event'].includes(String(body.flow)) || !/^[a-zA-Z0-9-]{10,80}$/.test(String(body.requestId))) return json({ error: 'Некорректный запрос' }, 400)
      const flow = body.flow as 'referral' | 'event', collection = collectionFor(flow)
      const record = await payload.findByID({ collection, id: Number(body.id), overrideAccess: true })
      if (!record.email || ['blocked', 'cancelled'].includes(record.status)) return json({ error: 'Письмо недоступно' }, 409)
      const key = `manual-email:${body.requestId}`
      if (record.status === 'pending') await payload.update({ collection, id: record.id, data: { tokenVersion: (record.tokenVersion || 1) + 1 }, overrideAccess: true })
      await enqueue(payload, 'email', { flow, recordId: record.id, template: record.status === 'pending' ? 'confirmation' : flow === 'referral' ? 'welcome' : 'programme' }, key)
      return json({ queued: true })
    }
    if (action === 'retry') {
      const job = await payload.findByID({ collection: 'automation-jobs', id: Number(body.id), overrideAccess: true })
      if (job.status !== 'failed') return json({ error: 'Повторить можно только задание с ошибкой' }, 409)
      await payload.update({ collection: 'automation-jobs', id: job.id, data: { status: 'queued', attempts: 0, runAt: new Date().toISOString(), lastError: null }, overrideAccess: true })
      return json({ queued: true })
    }
    if (action === 'cancel') {
      const result = await payload.update({ collection: 'automation-jobs', where: { and: [{ id: { equals: Number(body.id) } }, { status: { equals: 'queued' } }] }, data: { status: 'cancelled' }, overrideAccess: true })
      return result.docs.length ? json({ cancelled: true }) : json({ error: 'Задание уже выполняется или завершено' }, 409)
    }
    if (action === 'campaign') {
      const event = await eventBySlug(payload, String(body.eventSlug))
      if (event.status !== 'published' || !['reminder', 'programme'].includes(String(body.template))) return json({ error: 'Мероприятие или письмо недоступно' }, 400)
      const rows = await payload.find({ collection: 'event-registrations', where: { and: [{ eventSlug: { equals: event.slug } }, { status: { equals: 'confirmed' } }] }, pagination: false, overrideAccess: true })
      const recipients = rows.docs.filter(r => r.email)
      if (body.preview !== false) return json({ recipients: recipients.length })
      const id = String(body.campaignId || '')
      if (!/^[a-zA-Z0-9-]{10,80}$/.test(id)) return json({ error: 'Укажите идентификатор рассылки' }, 400)
      for (const row of recipients) await enqueue(payload, 'email', { flow: 'event', recordId: row.id, template: body.template }, `campaign:${id}:${row.id}`, typeof body.runAt === 'string' ? new Date(body.runAt).toISOString() : undefined)
      return json({ queued: recipients.length, campaignId: id })
    }
    return json({ error: 'Не найдено' }, 404)
  } catch (error) { return json({ error: error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[address]') : 'Ошибка обработки' }, 400) }
}
