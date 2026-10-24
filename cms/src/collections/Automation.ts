import { APIError, type CollectionConfig, type GlobalConfig, type Field, type CollectionBeforeValidateHook } from 'payload'
import { randomBytes } from 'node:crypto'
import { authenticated, contentManager, superAdmin } from '../access/staff'
import { settings } from '../automation/store'

const access = { read: authenticated, create: contentManager, update: contentManager, delete: superAdmin }
const identify: CollectionBeforeValidateHook = async ({ data, originalDoc, collection, req }) => {
  if (!data) return data
  const email = String(data.email || originalDoc?.email || '').trim().toLowerCase()
  if (email) data.email = email
  const contact = data.crmContactId || originalDoc?.crmContactId
  if (!data.key && !originalDoc?.key) data.key = collection.slug === 'referral-participants' ? `referral:${contact || email || randomBytes(8).toString('hex')}` : `${data.eventSlug}:${email || contact || randomBytes(8).toString('hex')}`
  if (collection.slug === 'referral-participants' && !data.code && !originalDoc?.code) data.code = contact || randomBytes(8).toString('hex')
  if (collection.slug === 'referral-participants' && !data.referralUrl && !originalDoc?.referralUrl) data.referralUrl = (await settings(req.payload)).config.referral.linkTemplate.replace('{code}', data.code || originalDoc?.code)
  return data
}
const identity: Field[] = [
  { name: 'emailActions', type: 'ui', admin: { components: { Field: './components/admin/AutomationRecordActions#RegistrationEmailActions' } } },
  { name: 'key', type: 'text', required: true, unique: true, admin: { readOnly: true } },
  { name: 'name', label: 'Имя', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', index: true },
  { name: 'phone', label: 'Телефон', type: 'text' },
  { name: 'crmContactId', label: 'Контакт Битрикс24', type: 'text', index: true },
  { name: 'crmDealIds', label: 'Сделки Битрикс24', type: 'json', defaultValue: [] },
  { name: 'confirmedAt', label: 'Подтверждение регистрации', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  { name: 'tokenVersion', type: 'number', defaultValue: () => 1, admin: { hidden: true } },
  { name: 'importedAt', label: 'Импортировано', type: 'date', admin: { readOnly: true } },
  { name: 'sourceData', label: 'Исходная запись CRM', type: 'json', admin: { readOnly: true } },
]
const template = (name: string, label: string): Field => ({ name, label, type: 'group', fields: [
  { name: 'subject', label: 'Тема письма', type: 'text' },
  { name: 'html', label: 'HTML письма', type: 'textarea', admin: { description: 'Переменные: {{name}}, {{confirm_url}}, {{code}}, {{referral_url}}, {{event_title}}, {{event_date}}, {{event_time}}, {{address}}, {{route_url}}, {{phone}}, {{programme}}, {{google_calendar_url}}, {{ics_url}}.' } },
  { name: 'text', label: 'Текстовая версия', type: 'textarea' },
] })
export const ReferralParticipants: CollectionConfig = {
  slug: 'referral-participants', labels: { singular: 'Участник реферальной программы', plural: 'Участники реферальной программы' },
  access, hooks: { beforeValidate: [identify] }, admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'code', 'status', 'confirmedAt'], group: 'Реферальная программа' },
  fields: [...identity,
    { name: 'code', label: 'Код участника', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'referralUrl', label: 'Реферальная ссылка', type: 'text', admin: { readOnly: true } },
    { name: 'status', label: 'Состояние', type: 'select', defaultValue: 'pending', required: true, options: [{ value: 'pending', label: 'Ожидает подтверждения' }, { value: 'active', label: 'Активен' }, { value: 'blocked', label: 'Заблокирован' }] },
    { name: 'notes', label: 'Примечание', type: 'textarea' },
  ],
}
export const Events: CollectionConfig = {
  slug: 'events', labels: { singular: 'Мероприятие', plural: 'Мероприятия' }, access,
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'startsAt', 'status'], group: 'Мероприятия' },
  hooks: { beforeValidate: [({ data, originalDoc }) => {
    const next = { ...originalDoc, ...data }
    if (next.startsAt && next.endsAt && !(new Date(next.endsAt).getTime() > new Date(next.startsAt).getTime())) throw new APIError('Окончание мероприятия должно быть позже начала', 400)
    if (next.timezone) try { new Intl.DateTimeFormat('ru', { timeZone: next.timezone }) } catch { throw new APIError('Проверьте часовой пояс', 400) }
    return data
  }] },
  fields: [{ type: 'tabs', tabs: [
    { label: 'Мероприятие', fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'slug', label: 'Код мероприятия', type: 'text', required: true, unique: true },
      { name: 'status', label: 'Состояние', type: 'select', defaultValue: 'draft', options: [{ value: 'draft', label: 'Черновик' }, { value: 'published', label: 'Опубликовано' }, { value: 'completed', label: 'Завершено' }, { value: 'cancelled', label: 'Отменено' }] },
      { name: 'description', label: 'Описание и механика', type: 'textarea' },
      { name: 'startsAt', label: 'Начало', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } } },
      { name: 'endsAt', label: 'Окончание', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } } },
      { name: 'timezone', label: 'Часовой пояс', type: 'text', defaultValue: 'Europe/Moscow' },
      { name: 'landingUrl', label: 'Страница мероприятия', type: 'text' },
    ] },
    { label: 'Программа', fields: [{ name: 'programme', label: 'Программа мероприятия', type: 'array', fields: [
      { name: 'time', label: 'Время', type: 'text' }, { name: 'title', label: 'Пункт программы', type: 'text', required: true }, { name: 'description', label: 'Описание', type: 'textarea' },
    ] }] },
    { label: 'Адрес и контакты', fields: [
      { name: 'address', label: 'Адрес', type: 'text' }, { name: 'landmark', label: 'Ориентир', type: 'text' },
      { name: 'latitude', label: 'Широта', type: 'number' }, { name: 'longitude', label: 'Долгота', type: 'number' },
      { name: 'markerLabel', label: 'Подпись точки', type: 'text', defaultValue: 'Авангард Строй' },
      { name: 'routeUrl', label: 'Ссылка на маршрут (необязательно)', type: 'text' }, { name: 'phone', label: 'Телефон', type: 'text' },
    ] },
    { label: 'Регистрация и CRM', fields: [
      { name: 'registrationEnabled', label: 'Приём регистраций', type: 'checkbox', defaultValue: false },
      { name: 'capacity', label: 'Количество мест (0 — без ограничения)', type: 'number', defaultValue: () => 0, min: 0 },
      { name: 'requireConfirmation', label: 'Подтверждать email', type: 'checkbox', defaultValue: true },
      { name: 'tokenTtlHours', label: 'Срок ссылки, часов', type: 'number', defaultValue: () => 72, min: 1 },
      { name: 'crmTitleMatch', label: 'Фрагмент названия сделки', type: 'text' },
      { name: 'crmConfirmedStage', label: 'Этап подтверждённой регистрации', type: 'text' },
    ] },
    { label: 'Письма и напоминания', fields: [
      template('confirmationEmail', 'Подтверждение регистрации'), template('programmeEmail', 'Программа и календарь'), template('reminderEmail', 'Напоминание'),
      { name: 'reminderEnabled', label: 'Автоматическое напоминание', type: 'checkbox', defaultValue: false },
      { name: 'reminderHoursBefore', label: 'За сколько часов до начала', type: 'number', defaultValue: () => 24, min: 0 },
      { name: 'mailing', type: 'ui', admin: { components: { Field: './components/admin/AutomationRecordActions#EventMailingField' } } },
    ] },
  ] }],
}
export const EventRegistrations: CollectionConfig = {
  slug: 'event-registrations', labels: { singular: 'Регистрация на мероприятие', plural: 'Регистрации на мероприятия' }, access,
  hooks: { beforeValidate: [identify] }, admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'eventSlug', 'status'], group: 'Мероприятия' },
  fields: [...identity,
    { name: 'eventSlug', label: 'Мероприятие', type: 'text', required: true, index: true },
    { name: 'status', label: 'Состояние', type: 'select', required: true, defaultValue: 'pending', options: [{ value: 'pending', label: 'Ожидает подтверждения' }, { value: 'confirmed', label: 'Подтверждено' }, { value: 'cancelled', label: 'Отменено' }, { value: 'attended', label: 'Посетил' }] },
    { name: 'notes', label: 'Примечание', type: 'textarea' },
  ],
}
export const AutomationJobs: CollectionConfig = {
  slug: 'automation-jobs', labels: { singular: 'Задание', plural: 'Очередь и журнал' },
  access: { read: authenticated, create: () => false, update: () => false, delete: superAdmin },
  admin: { useAsTitle: 'kind', defaultColumns: ['kind', 'status', 'attempts', 'runAt', 'lastError'], group: 'Обмен данными' },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true },
    { name: 'kind', label: 'Тип', type: 'text', required: true, index: true },
    { name: 'data', label: 'Параметры', type: 'json', required: true },
    { name: 'status', label: 'Состояние', type: 'select', required: true, defaultValue: 'queued', options: ['queued', 'running', 'completed', 'failed', 'cancelled'] },
    { name: 'attempts', label: 'Попытки', type: 'number', defaultValue: () => 0 },
    { name: 'runAt', label: 'Запланировано', type: 'date', required: true, index: true },
    { name: 'lease', type: 'text', admin: { hidden: true } }, { name: 'lockedAt', type: 'date', admin: { hidden: true } },
    { name: 'lastError', label: 'Последняя ошибка', type: 'text' }, { name: 'result', label: 'Результат', type: 'json' }, { name: 'completedAt', type: 'date' },
    { name: 'actions', type: 'ui', admin: { components: { Field: './components/admin/AutomationRecordActions#AutomationJobActions' } } },
  ],
}
export const AutomationImports: CollectionConfig = {
  slug: 'automation-imports', labels: { singular: 'Импорт', plural: 'История импорта' },
  access: { read: authenticated, create: () => false, update: () => false, delete: superAdmin },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'status', 'createdAt'], group: 'Обмен данными' },
  fields: [{ name: 'name', type: 'text', required: true }, { name: 'status', type: 'text', required: true }, { name: 'report', type: 'json' }],
}
export const AutomationSettings: GlobalConfig = {
  slug: 'automation-settings', label: 'Автоматизация', access: { read: superAdmin, update: () => false },
  fields: [
    { name: 'config', label: 'Настройки', type: 'json' },
    { name: 'vault', type: 'json', access: { read: () => false }, admin: { hidden: true } },
    { name: 'cutover', type: 'json', admin: { hidden: true } },
  ],
}
