import { after } from 'next/server'
import type { CollectionConfig, GlobalConfig } from 'payload'
import { authenticated, contentManager, superAdmin } from '../access/staff'
import { authorizeSiteRequest } from './project-hero-endpoint'
import { leadInputSchema } from '../../../src/lib/leads'
import { activeRoistatProjectId, deliverLead, deliveryIsEnabled, roistatWebhookUrlError } from '../config/lead-adapters'
import { leadTitle } from '../config/lead-title'
import { normalizeMapsApiKey, normalizeMetricaCounterId, publicMapsKey, publicMetrica } from '../config/yandex'
import { acceptLead } from '../config/lead-intake'
import { enqueue, settings as automationSettings } from '../automation/store'
import { resolveLeadClassification } from '../config/lead-classification'
import { leadClassificationEndpoint } from './lead-classification-endpoint'

export const LeadDelivery: GlobalConfig = {
  slug: 'lead-delivery', label: 'Отправка заявок', access: { read: superAdmin, update: superAdmin },
  fields: [
    { name: 'mode', label: 'Способ отправки', type: 'select', required: true, defaultValue: 'disabled', options: [{ value: 'disabled', label: 'Отключено' }, { value: 'test', label: 'Тестовый обработчик' }, { value: 'webhook', label: 'API / вебхук' }, { value: 'roistat', label: 'Roistat (универсальный вебхук)' }], admin: { description: 'Сделку в Битрикс24 создаёт Roistat. Адрес вебхука и счётчики задаются в интеграциях.' } },
    { name: 'deliveryEnabled', label: 'Передача включена', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
    { name: 'roistatWebhookUrl', label: 'Адрес вебхука Roistat', type: 'text', admin: { hidden: true }, validate: (value: unknown) => roistatWebhookUrlError(value) || true },
    { name: 'roistatCounters', label: 'Счётчики Roistat', type: 'json', admin: { hidden: true } },
    { name: 'metricaEnabled', label: 'Метрика включена', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
    { name: 'metricaCounterId', label: 'Номер счётчика Метрики', type: 'text', admin: { hidden: true }, validate: (value: unknown) => !value || Boolean(normalizeMetricaCounterId(value)) || 'Укажите номер счётчика цифрами' },
    { name: 'metricaConnectedAt', label: 'Дата подключения Метрики', type: 'text', admin: { hidden: true } },
    { name: 'mapsEnabled', label: 'Карты включены', type: 'checkbox', defaultValue: true, admin: { hidden: true } },
    { name: 'mapsApiKey', label: 'Ключ API Яндекс.Карт', type: 'text', admin: { hidden: true }, validate: (value: unknown) => !value || Boolean(normalizeMapsApiKey(value)) || 'Укажите ключ JS API Яндекс.Карт' },
    { name: 'url', label: 'Адрес API / вебхука', type: 'text', admin: { condition: data => data.mode === 'webhook' }, validate: (value: unknown, { siblingData }: { siblingData?: { mode?: string } }) => {
      if (siblingData?.mode !== 'webhook') return true
      try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? true : 'Укажите адрес HTTP или HTTPS без логина и пароля' } catch { return 'Укажите адрес HTTP или HTTPS' }
    } },
    { name: 'authorizationEnv', label: 'Переменная окружения с заголовком Authorization', type: 'text', admin: { condition: data => data.mode === 'webhook', description: 'Необязательно. Например, CRM_AUTHORIZATION. Значение с токеном задаётся в окружении CMS.' }, validate: (value: unknown) => !value || typeof value === 'string' && /^[A-Z][A-Z0-9_]*$/.test(value) ? true : 'Укажите имя переменной окружения' },
  ],
  endpoints: [
    {
      path: '/counter', method: 'get', handler: async req => {
        const settings = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: true })
        return Response.json(activeRoistatProjectId(settings.roistatCounters), { headers: { 'Cache-Control': 'public, max-age=60' } })
      },
    },
    {
      path: '/metrica', method: 'get', handler: async req => {
        const settings = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: true })
        return Response.json(publicMetrica(settings), { headers: { 'Cache-Control': 'public, max-age=60' } })
      },
    },
    {
      path: '/maps-key', method: 'get', handler: async req => {
        const settings = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: true })
        return Response.json(publicMapsKey(settings), { headers: { 'Cache-Control': 'public, max-age=60' } })
      },
    },
  ],
}

function storedLeadTitle(doc: { title?: unknown; requestId?: unknown; payload?: unknown }) {
  if (typeof doc.title === 'string' && doc.title.trim()) return doc.title.trim()
  const payload = doc.payload && typeof doc.payload === 'object' && !Array.isArray(doc.payload) ? doc.payload as Record<string, unknown> : null
  const fromPayload = typeof payload?.title === 'string' ? payload.title.trim() : ''
  return fromPayload || (typeof doc.requestId === 'string' ? doc.requestId : '')
}

export const LeadSubmissions: CollectionConfig = {
  slug: 'lead-submissions', labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'formId', 'status', 'createdAt'], components: { views: { list: { Component: './components/admin/LeadsView#LeadsListRedirect' } } } },
  access: { read: authenticated, create: () => false, update: () => false, delete: contentManager },
  hooks: {
    beforeValidate: [({ data, originalDoc }) => data ? { ...data, ...resolveLeadClassification(data, originalDoc) } : data],
    afterRead: [({ doc }) => { doc.title = storedLeadTitle(doc); Object.assign(doc, resolveLeadClassification(doc)); return doc }],
    afterChange: [async ({ doc, operation, req }) => {
      if (operation !== 'create' || !['referral-program', 'FactoryOpenDayForm'].includes(doc.formId)) return doc
      const saved = await automationSettings(req.payload)
      if (!(saved.cutover as { active?: boolean } | null)?.active) return doc
      await enqueue(req.payload, 'intake', doc.payload as Record<string, unknown>, `intake:${doc.requestId}`, undefined, req)
      return doc
    }],
  },
  fields: [
    { name: 'leadType', type: 'select', label: 'Тип заявки', defaultValue: 'work', options: [{ value: 'work', label: 'Рабочая' }, { value: 'test', label: 'Тестовая' }, { value: 'spam', label: 'Спам' }], admin: { hidden: true } },
    { name: 'typeSource', type: 'select', defaultValue: 'auto', options: ['auto', 'manual'], admin: { hidden: true } },
    { name: 'typeReason', type: 'text', admin: { hidden: true } },
    { name: 'title', type: 'text', label: 'Название сделки', admin: { hidden: true } },
    { name: 'requestId', type: 'text', label: 'Идентификатор отправки', required: true, unique: true, admin: { hidden: true } },
    { name: 'formId', type: 'text', label: 'Форма', required: true, admin: { hidden: true } },
    { name: 'status', type: 'select', label: 'Состояние', required: true, options: [{ value: 'pending', label: 'Передача' }, { value: 'test', label: 'Принято тестовым обработчиком' }, { value: 'sent', label: 'Передано интеграции' }, { value: 'failed', label: 'Ошибка передачи' }], admin: { hidden: true } },
    { name: 'payload', type: 'json', label: 'Данные и контекст обращения', required: true, admin: { hidden: true } },
    { name: 'details', type: 'ui', admin: { components: { Field: './components/admin/LeadSubmissionView#LeadSubmissionDetails' } } },
    { name: 'preview', type: 'ui', admin: { position: 'sidebar', components: { Field: './components/admin/LeadSubmissionView#LeadSubmissionPayload' } } },
  ],
  endpoints: [leadClassificationEndpoint, { path: '/submit', method: 'post', handler: async req => {
    const denied = authorizeSiteRequest(req)
    if (denied) return denied
    let input
    try { input = leadInputSchema.safeParse(await req.json!()) } catch { return Response.json({ error: 'Некорректные данные' }, { status: 400 }) }
    if (!input.success || !input.data.formId) return Response.json({ error: 'Некорректные данные формы' }, { status: 400 })
    const settings = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: true })
    if (!deliveryIsEnabled(settings)) return Response.json({ error: 'Отправка не настроена' }, { status: 503 })
    const form = await req.payload.find({ collection: 'forms', where: { key: { equals: input.data.formId } }, limit: 1, depth: 0, req, overrideAccess: true })
    const title = leadTitle(input.data, form.docs[0]?.title || '')
    const lead = input.data
    const result = await acceptLead(lead, {
      find: async requestId => (await req.payload.find({ collection: 'lead-submissions', where: { requestId: { equals: requestId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0],
      save: requestId => req.payload.create({ collection: 'lead-submissions', data: { requestId, formId: lead.formId!, status: 'pending', title, payload: { ...lead, title } }, overrideAccess: true }),
      defer: work => after(work),
      deliver: requestId => deliverLead(settings, lead, requestId, fetch, title),
      update: (id, data) => req.payload.update({ collection: 'lead-submissions', id, data, overrideAccess: true }),
      report: error => req.payload.logger.error({ failure: error instanceof Error ? error.name : 'Error', requestId: lead.requestId, msg: 'Lead integration delivery failed; receipt retained in CMS' }),
    })
    return Response.json(result, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  } }],
}
