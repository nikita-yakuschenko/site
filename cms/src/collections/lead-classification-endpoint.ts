import type { Endpoint } from 'payload'
import { activeStaff } from '../access/staff'
import { detectLeadType, isLeadType } from '../config/lead-classification'

export const leadClassificationEndpoint: Endpoint = {
  path: '/:id/classify', method: 'post', handler: async req => {
    const user = await activeStaff(req)
    if (!user || !['super-admin', 'admin'].includes(user.role)) return Response.json({ error: 'Нет прав на изменение типа заявки' }, { status: 403 })
    const allowedOrigins = new Set([new URL(req.url!).origin])
    if (process.env.CMS_PUBLIC_URL) allowedOrigins.add(new URL(process.env.CMS_PUBLIC_URL).origin)
    if (!allowedOrigins.has(req.headers.get('origin') || '')) return Response.json({ error: 'Недопустимый источник запроса' }, { status: 403 })
    const id = Number(req.routeParams?.id)
    if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Некорректная заявка' }, { status: 400 })
    let body: unknown
    try { body = await req.json!() } catch { return Response.json({ error: 'Некорректный запрос' }, { status: 400 }) }
    const type = body && typeof body === 'object' && 'type' in body ? body.type : undefined
    if (type !== 'auto' && !isLeadType(type)) return Response.json({ error: 'Неизвестный тип заявки' }, { status: 400 })
    const doc = await req.payload.findByID({ collection: 'lead-submissions', id, req, overrideAccess: false, disableErrors: true })
    if (!doc) return Response.json({ error: 'Заявка не найдена' }, { status: 404 })
    const classification = type === 'auto' ? detectLeadType(doc.payload) : { leadType: type, typeSource: 'manual' as const, typeReason: 'Тип выбран сотрудником вручную.' }
    // Изменяются только поля классификации, входящие данные заявки неизменяемы.
    await req.payload.update({ collection: 'lead-submissions', id, data: classification, req, overrideAccess: true })
    return Response.json(classification, { headers: { 'Cache-Control': 'no-store' } })
  },
}
