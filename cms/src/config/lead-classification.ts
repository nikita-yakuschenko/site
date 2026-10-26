export const leadTypes = ['work', 'test', 'spam'] as const
export type LeadType = typeof leadTypes[number]
export const leadTypeLabels: Record<LeadType, string> = { work: 'Рабочая', test: 'Тестовая', spam: 'Спам' }
export type LeadClassification = { leadType: LeadType; typeSource: 'auto' | 'manual'; typeReason: string }

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
export function isLeadType(value: unknown): value is LeadType { return leadTypes.includes(value as LeadType) }

/** Консервативные объяснимые правила; сомнительные обращения остаются рабочими. */
export function detectLeadType(value: unknown): LeadClassification {
  const payload = record(value), meta = record(payload.meta)
  const content = [text(payload.name), text(payload.message)].join(' ').normalize('NFKC').toLocaleLowerCase('ru')
  const result = (leadType: LeadType, typeReason: string): LeadClassification => ({ leadType, typeSource: 'auto', typeReason })
  if (/(^|[^\p{L}\p{N}])(тест|тестовая|тестовый|test|testing|qa)(?=$|[^\p{L}\p{N}])/u.test(content) || /не\s+обрабатывать|проверка\s+(формы|отправки|аналитики)/u.test(content)) return result('test', 'В имени или сообщении есть явная тестовая пометка.')
  const phone = text(payload.phone).replace(/\D/g, '')
  if (/(\d)\1{6,}/.test(phone)) return result('test', 'Телефон похож на тестовую заглушку: не менее семи одинаковых цифр подряд.')
  const email = text(meta.email || payload.email).toLowerCase()
  if (/@(?:example\.(?:com|org|net)|[^@]+\.(?:test|invalid))$/.test(email)) return result('test', 'Email использует зарезервированный тестовый домен.')
  const externalLinks = (content.match(/https?:\/\/[^\s<>()]+/g) || []).filter(link => {
    try { const host = new URL(link).hostname; return host !== 'avgst.ru' && !host.endsWith('.avgst.ru') } catch { return false }
  })
  if (externalLinks.length >= 3) return result('spam', 'В имени или сообщении три и более внешних ссылок.')
  if (/buy\s+backlinks|купить\s+базу\s+(клиентов|номеров)|продвижение\s+вашего\s+сайта/u.test(content)) return result('spam', 'В сообщении обнаружено типовое предложение массовой рекламы.')
  return result('work', 'Явных признаков теста или спама нет.')
}

export function resolveLeadClassification(value: unknown, previous: unknown = {}): LeadClassification {
  const data = record(value), original = record(previous)
  const source = data.typeSource ?? original.typeSource
  const type = data.leadType ?? original.leadType
  if (source === 'manual' && isLeadType(type)) return { leadType: type, typeSource: 'manual', typeReason: 'Тип выбран сотрудником вручную.' }
  return detectLeadType(data.payload ?? original.payload)
}
