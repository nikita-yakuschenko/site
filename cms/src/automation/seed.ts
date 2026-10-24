import type { Payload } from 'payload'
export async function seedOpenDay(payload: Payload) {
  const legacy = await payload.find({ collection: 'events', where: { slug: { equals: 'factory-open-day-legacy' } }, limit: 1, overrideAccess: true })
  if (!legacy.docs.length) await payload.create({ collection: 'events', data: {
    title: 'Архив регистраций: дата не указана', slug: 'factory-open-day-legacy', status: 'completed', startsAt: '2026-09-12T07:00:00.000Z', endsAt: '2026-09-12T10:00:00.000Z', registrationEnabled: false,
    description: 'Исходные заявки без даты мероприятия в названии. Дата записи соответствует настройке старого обработчика (12 сентября), а не подтверждённой дате участия. Эти регистрации исключены из рассылок текущего мероприятия.', crmConfirmedStage: 'UC_X25RZI', reminderEnabled: false,
  }, overrideAccess: true })
  const exists = await payload.find({ collection: 'events', where: { slug: { equals: 'factory-open-day' } }, limit: 1, overrideAccess: true })
  if (exists.docs.length) return exists.docs[0]
  return payload.create({ collection: 'events', overrideAccess: true, data: {
    title: 'День открытых дверей', slug: 'factory-open-day', status: 'published', startsAt: '2026-11-14T07:00:00.000Z', endsAt: '2026-11-14T10:05:00.000Z', timezone: 'Europe/Moscow', landingUrl: 'https://avgst.ru/factory-open-day',
    description: 'Бесплатное участие по предварительной записи. После заявки участник подтверждает email и получает программу, маршрут и событие для календаря. Напоминание отправляется только участникам, подтвердившим регистрацию.',
    address: 'Нижний Новгород, ул. Зайцева, 31к1', landmark: 'Проходная бывшего завода ЗКПД-4', latitude: 56.366307, longitude: 43.791522, markerLabel: 'Авангард Строй', phone: '+7 (831) 200-38-89', registrationEnabled: true, requireConfirmation: true, crmTitleMatch: 'Регистрация на день открытых дверей', crmConfirmedStage: 'UC_X25RZI', reminderEnabled: false,
    programme: [
      { time: '10 минут', title: 'Встреча гостей', description: 'Знакомство и инструктаж.' },
      { time: '45 минут', title: 'Экскурсия по цехам', description: 'От отбора материалов до готового дома.' },
      { time: '15 минут', title: 'Трансфер на выставочную площадку', description: 'Переезд между площадками.' },
      { time: '30 минут', title: 'Почувствуйте себя как дома', description: 'Почувствуйте реальные размеры и сравните планировочные решения.' },
      { time: '15 минут', title: 'Согревающий глинтвейн и приятная беседа', description: 'Неформальное общение с экспертами.' },
      { time: '20–25 минут', title: 'Диалог с архитектором: тренды загородной архитектуры', description: 'Разберём архитектурные тренды, цветовые решения, актуальные планировки и проекты.' },
      { time: '15 минут', title: 'Ипотека на дом в 2027 году: условия и цифры', description: 'Что изменилось на рынке ИЖС: разберём ипотечные условия банков и посчитаем средний ежемесячный платёж.' },
      { time: '15 минут', title: 'Открытый диалог', description: 'Ответы на любые вопросы.' },
      { time: '15 минут', title: 'Трансфер на производственную площадку', description: 'При необходимости.' },
    ],
    confirmationEmail: { subject: 'Подтвердите запись — День открытых дверей', html: '<p>Здравствуйте, {{name}}!</p><p>Вы записались на {{event_title}} — {{event_date}} в {{event_time}}.</p><p><a href="{{confirm_url}}">Подтвердить регистрацию</a></p>', text: 'Здравствуйте, {{name}}! Подтвердите запись: {{confirm_url}}' },
    programmeEmail: { subject: 'Ваша программа — День открытых дверей {{event_date}}', html: '<p>Здравствуйте, {{name}}!</p><p>Ждём вас {{event_date}} в {{event_time}}.</p><p>{{address}}</p><p style="white-space:pre-line">{{programme}}</p><p><a href="{{route_url}}">Построить маршрут</a> · <a href="{{google_calendar_url}}">Добавить в Google Календарь</a> · <a href="{{ics_url}}">Скачать событие</a></p><p>По вопросам: {{phone}}</p>', text: 'Здравствуйте, {{name}}! Ждём вас {{event_date}} в {{event_time}}. {{address}}\n{{programme}}\nМаршрут: {{route_url}}\nТелефон: {{phone}}' },
    reminderEmail: { subject: 'Напоминаем о встрече {{event_date}} — Авангард Строй', html: '<p>Здравствуйте, {{name}}!</p><p>Напоминаем: {{event_title}} состоится {{event_date}} в {{event_time}}.</p><p>{{address}}</p><p><a href="{{route_url}}">Построить маршрут</a></p><p>{{phone}}</p>', text: 'Здравствуйте, {{name}}! {{event_title}} — {{event_date}} в {{event_time}}. {{address}}. {{route_url}}. {{phone}}' },
  } })
}
