import { randomUUID } from 'node:crypto'
import type { CollectionConfig, GlobalConfig } from 'payload'
import { authenticated, contentManager, superAdmin } from '../access/staff'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { leadInputSchema } from '../../../src/lib/leads'
import { deliverLead } from '../config/lead-adapters'

export const LeadDelivery: GlobalConfig = {
  slug: 'lead-delivery', label: 'Отправка заявок', access: { read: superAdmin, update: superAdmin },
  fields: [
    { name: 'mode', label: 'Способ отправки', type: 'select', required: true, defaultValue: 'disabled', options: [{ value: 'disabled', label: 'Отключено' }, { value: 'test', label: 'Тестовый обработчик' }, { value: 'webhook', label: 'API / вебхук' }] },
    { name: 'url', label: 'Адрес API / вебхука', type: 'text', admin: { condition: data => data.mode === 'webhook' }, validate: (value: unknown, { siblingData }: { siblingData?: { mode?: string } }) => {
      if (siblingData?.mode !== 'webhook') return true
      try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? true : 'Укажите адрес HTTP или HTTPS без логина и пароля' } catch { return 'Укажите адрес HTTP или HTTPS' }
    } },
    { name: 'authorizationEnv', label: 'Переменная окружения с заголовком Authorization', type: 'text', admin: { condition: data => data.mode === 'webhook', description: 'Необязательно. Например, CRM_AUTHORIZATION. Значение с токеном задаётся в окружении CMS.' }, validate: (value: unknown) => !value || typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value) ? true : 'Укажите имя переменной окружения' },
  ],
}

export const LeadSubmissions: CollectionConfig = {
  slug: 'lead-submissions', labels: { singular: 'Отправка формы', plural: 'Отправки форм' },
  admin: { useAsTitle: 'requestId', defaultColumns: ['requestId', 'formId', 'status', 'createdAt'] },
  access: { read: authenticated, create: () => false, update: () => false, delete: contentManager },
  fields: [
    { name: 'requestId', type: 'text', label: 'Идентификатор отправки', required: true, unique: true },
    { name: 'formId', type: 'text', label: 'Форма', required: true },
    { name: 'status', type: 'select', label: 'Состояние', required: true, options: [{ value: 'pending', label: 'Передача' }, { value: 'test', label: 'Принято тестовым обработчиком' }, { value: 'sent', label: 'Передано интеграции' }, { value: 'failed', label: 'Ошибка передачи' }] },
    { name: 'payload', type: 'json', label: 'Данные и контекст обращения', required: true },
  ],
  endpoints: [{ path: '/submit', method: 'post', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    let input
    try { input = leadInputSchema.safeParse(await req.json!()) } catch { return Response.json({ error: 'Некорректные данные' }, { status: 400 }) }
    if (!input.success || !input.data.formId) return Response.json({ error: 'Некорректные данные формы' }, { status: 400 })
    const settings = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: true })
    if (settings.mode === 'disabled') return Response.json({ error: 'Отправка не настроена' }, { status: 503 })
    const receipt = await req.payload.create({ collection: 'lead-submissions', data: { requestId: randomUUID(), formId: input.data.formId, status: 'pending', payload: input.data }, req, overrideAccess: true })
    try {
      const result = await deliverLead(settings, input.data, receipt.requestId)
      await req.payload.update({ collection: 'lead-submissions', id: receipt.id, data: result, req, overrideAccess: true })
      return Response.json({ accepted: true, id: receipt.requestId, mode: result.status }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      await req.payload.update({ collection: 'lead-submissions', id: receipt.id, data: { status: 'failed' }, req, overrideAccess: true })
      return Response.json({ error: 'Не удалось передать данные интеграции' }, { status: 502 })
    }
  } }],
}
