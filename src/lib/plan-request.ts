import { z } from 'zod'
import { isValidName, isValidRuMobile, phoneE164, sanitizeName } from './phone'
import { planRequestDemoEnabled } from './plan-request-feature'

export const PLAN_REQUEST_DEMO_RECEIPT = 'Демонстрация: данные успешно проверены. Заявка никуда не отправлена'
export const planModes = [
  { id: 'modify_current', title: 'Изменить проект', description: 'Доработать дом.' },
  { id: 'custom_requirements', title: 'Свои пожелания', description: 'Описать свой дом.' },
  { id: 'own_sketch', title: 'Свой эскиз', description: 'Прикрепить план.' },
] as const
export type PlanRequestMode = typeof planModes[number]['id']
export const planChanges = ['Увеличить помещение', 'Добавить комнату', 'Изменить санузлы', 'Изменить расположение помещений', 'Изменить террасу или вход', 'Другое'] as const
export const roomKinds = [
  { id: 'kitchen', name: 'Кухня-гостиная', category: 'heated' },
  { id: 'bedroom', name: 'Спальня', category: 'heated' },
  { id: 'master', name: 'Мастер-спальня', category: 'heated' },
  { id: 'office', name: 'Кабинет', category: 'heated' },
  { id: 'wardrobe', name: 'Гардеробная', category: 'heated' },
  { id: 'storage', name: 'Кладовая', category: 'heated' },
  { id: 'laundry', name: 'Постирочная', category: 'engineering' },
  { id: 'boiler', name: 'Котельная', category: 'engineering' },
  { id: 'sauna', name: 'Сауна', category: 'engineering' },
  { id: 'terrace', name: 'Терраса', category: 'outdoor' },
  { id: 'other', name: 'Другое', category: 'heated' },
] as const
export type RoomCategory = 'heated' | 'engineering' | 'outdoor'
export type RoomWish = { id: string; kind: typeof roomKinds[number]['id']; name: string; area: string; category: RoomCategory }
export type RequirementsDraft = { area: string; customArea: string; bedrooms: string; bathrooms: string; floors: string; extras: string[]; rooms: RoomWish[]; comment: string }
export const emptyRequirements = (): RequirementsDraft => ({ area: 'unknown', customArea: '', bedrooms: 'unknown', bathrooms: 'unknown', floors: 'unknown', extras: [], rooms: [], comment: '' })
export type PlanRequestContext = { projectId: string; projectCode?: string; projectSlug: string; projectName: string; variant: { index: number; label: string } | null; floor: { index: number; label: string } | null; source: 'project-plans'; sourcePath: string }
const comment = z.string().trim().max(500, 'Не больше 500 символов')
const category = z.enum(['heated', 'engineering', 'outdoor'])
const selection = (values: readonly string[]) => z.string().refine(value => values.includes(value), 'Выберите значение из списка')
const safeLink = z.string().trim().max(2000).refine(value => {
  if (!value) return true
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password } catch { return false }
}, 'Укажите ссылку, начинающуюся с https:// или http://')
export const sketchMetadataSchema = z.object({ name: z.string().min(1).max(160), size: z.number().int().positive().max(10 * 1024 * 1024), type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']) }).strict()
export type SketchMetadata = z.infer<typeof sketchMetadataSchema>
const requirementsSchema = z.object({
  area: selection(['unknown', 'up-to-80', '80-120', '120-180', '180-plus', 'custom']), customArea: z.string().trim().max(40),
  bedrooms: selection(['unknown', '1', '2', '3', '4+']), bathrooms: selection(['unknown', '1', '2', '3+']), floors: selection(['unknown', '1', '2']),
  extras: z.array(z.object({ kind: z.string().refine(id => roomKinds.some(room => room.id === id)), category })).max(8),
  rooms: z.array(z.object({ name: z.string().trim().min(1, 'Укажите название помещения').max(80), minArea: z.number({ error: 'Укажите площадь числом' }).positive('Площадь должна быть больше нуля').max(2000, 'Площадь помещения не должна превышать 2000 м²').optional(), category })).max(12), comment,
}).strict().superRefine((data, ctx) => {
  if (data.area !== 'custom') return
  const parts = data.customArea.replace(',', '.').split(/\s*[-–—]\s*/).map(Number)
  if (!/^\d+(?:[.,]\d+)?(?:\s*[-–—]\s*\d+(?:[.,]\d+)?)?$/.test(data.customArea) || parts.some(n => n <= 0 || n > 2000) || (parts.length === 2 && parts[0]! > parts[1]!)) ctx.addIssue({ code: 'custom', path: ['customArea'], message: 'Укажите площадь или диапазон, например 100–140' })
})
export const planDetailsSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('modify_current'), wishes: z.object({ changes: z.array(z.enum(planChanges)).max(6), comment }).strict() }).strict(),
  z.object({ mode: z.literal('custom_requirements'), wishes: requirementsSchema }).strict(),
  z.object({ mode: z.literal('own_sketch'), wishes: z.object({ file: sketchMetadataSchema.nullable(), link: safeLink, comment }).strict().refine(data => data.file !== null || Boolean(data.link) || data.comment.length >= 3, { message: 'Добавьте файл, ссылку или описание эскиза' }) }).strict(),
])
export type PlanDetails = z.infer<typeof planDetailsSchema>
export const planContactSchema = z.object({
  name: z.string().transform(value => sanitizeName(value).trim()).refine(isValidName, 'Укажите имя: не меньше двух букв').refine(value => value.length <= 120, 'Имя слишком длинное'),
  phone: z.string().refine(isValidRuMobile, 'Укажите российский мобильный номер полностью').transform(phoneE164),
  preferredContact: z.enum(['call', 'whatsapp', 'telegram', 'max']), comment,
  consent: z.literal(true, { error: 'Нужно согласие на обработку персональных данных' }),
}).strict()
export const planRequestSchema = z.object({ version: z.literal(1), context: z.object({ projectId: z.string().min(1), projectCode: z.string().optional(), projectSlug: z.string().min(1), projectName: z.string().min(1), variant: z.object({ index: z.number().int().nonnegative(), label: z.string() }).nullable(), floor: z.object({ index: z.number().int().nonnegative(), label: z.string() }).nullable(), source: z.literal('project-plans'), sourcePath: z.string().max(500) }).strict(), details: planDetailsSchema, contact: planContactSchema }).strict()
export type PlanRequest = z.infer<typeof planRequestSchema>

export function requirementsDetails(draft: RequirementsDraft): PlanDetails {
  return { mode: 'custom_requirements', wishes: {
    ...draft, customArea: draft.area === 'custom' ? draft.customArea : '',
    extras: draft.extras.map(kind => ({ kind, category: roomKinds.find(room => room.id === kind)!.category })),
    rooms: draft.rooms.map(room => ({ name: room.kind === 'other' ? room.name : roomKinds.find(kind => kind.id === room.kind)!.name, ...(room.area ? { minArea: Number(room.area.replace(',', '.')) } : {}), category: room.kind === 'other' ? room.category : roomKinds.find(kind => kind.id === room.kind)!.category })),
  } }
}

/** Local adapter only: no fetch, analytics, logging or persistent storage. */
export async function submitPlanRequestDemo(input: unknown): Promise<{ demo: true; request: PlanRequest }> {
  if (!planRequestDemoEnabled()) throw new Error('Локальная демонстрация выключена')
  const request = planRequestSchema.parse(input)
  await new Promise(resolve => setTimeout(resolve, 250))
  return { demo: true, request }
}

export async function validateSketchFile(file: File): Promise<SketchMetadata> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Выберите непустой файл размером до 10 МБ')
  const extension = file.name.split('.').pop()?.toLowerCase()
  const types: Record<string, SketchMetadata['type']> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' }
  const type = extension ? types[extension] : undefined
  if (!type || file.type && file.type !== type) throw new Error('Подойдут JPG, PNG, WebP или PDF')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const text = new TextDecoder().decode(bytes)
  const valid = type === 'application/pdf' ? text.startsWith('%PDF-') : type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte) : text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP'
  if (!valid) throw new Error('Содержимое файла не соответствует формату. Выберите другой файл')
  return { name: file.name.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 160), size: file.size, type }
}
