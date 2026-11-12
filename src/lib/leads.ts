import { z } from 'zod'
import { recordIdPattern } from './record-id'

export const leadInputSchema = z.object({
  requestId: z.string().uuid().optional(),
  captchaToken: z.string().trim().min(1).max(4096).optional(),
  name: z.string().trim().max(120).default(''),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(32)
    .regex(/^[+\d][\d\s()-]{8,}$/),
  siteId: z.union([z.number().int().positive(), z.string().trim().min(1).max(120)]),
  pageId: z.union([z.number().int().positive(), z.string().trim().min(1).max(120)]).optional(),
  projectId: z.string().regex(recordIdPattern).optional(),
  formId: z.string().trim().min(1).max(120).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  message: z.string().trim().max(5000).optional(),
  meta: z.record(z.string().max(80), z.unknown()).superRefine((value, ctx) => {
    const valid = (item: unknown, depth: number): boolean => {
      if (depth > 4) return false
      if (item === null || typeof item === 'boolean' || typeof item === 'number') return true
      if (typeof item === 'string') return item.length <= 5000
      if (Array.isArray(item)) return item.length <= 50 && item.every(child => valid(child, depth + 1))
      return typeof item === 'object' && Object.keys(item).length <= 50 && Object.entries(item).every(([key, child]) => key.length <= 80 && valid(child, depth + 1))
    }
    if (!valid(value, 0) || JSON.stringify(value).length > 16000) ctx.addIssue({ code: 'custom', message: 'Metadata is too large or deeply nested' })
  }).optional(),
  projectExternalId: z.string().trim().max(120).optional(),
  sourcePath: z.string().trim().max(500).optional(),
  consent: z.literal(true),
}).refine(lead => lead.name.length >= 2 || (lead.formId === 'project-passport' && lead.name === ''), {
  path: ['name'],
  message: 'Укажите имя',
})

export type LeadInput = z.infer<typeof leadInputSchema>

type Bucket = { hits: number[]; }

const buckets = new Map<string, Bucket>()

export function allowLeadAttempt(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
  for (const [id, value] of buckets) if (!value.hits.some(ts => now - ts < windowMs)) buckets.delete(id)
  if (!buckets.has(key) && buckets.size >= 10000) return false
  const bucket = buckets.get(key) || { hits: [] }
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs)
  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    return false
  }
  bucket.hits.push(now)
  buckets.set(key, bucket)
  return true
}

type PassportBucket = { hits: number[]; banUntil: number }
const passportBuckets = new Map<string, PassportBucket>()
const passportHour = 60 * 60 * 1000
const passportBan = 3 * 60 * 60 * 1000

// Больше 10 скачиваний за час закрывает адрес на 3 часа. Пока бан действует, попытка не считается.
export function allowPassportDownload(key: string): boolean {
  const now = Date.now()
  for (const [id, value] of passportBuckets) if (value.banUntil <= now && !value.hits.some(ts => now - ts < passportHour)) passportBuckets.delete(id)
  if (!passportBuckets.has(key) && passportBuckets.size >= 10000) return false
  const bucket = passportBuckets.get(key) || { hits: [], banUntil: 0 }
  if (bucket.banUntil > now) return false
  bucket.hits = bucket.hits.filter(ts => now - ts < passportHour)
  if (bucket.hits.length >= 10) {
    bucket.banUntil = now + passportBan
    bucket.hits = []
    passportBuckets.set(key, bucket)
    return false
  }
  passportBuckets.set(key, bucket)
  return true
}

export function notePassportDownload(key: string) {
  const now = Date.now()
  const bucket = passportBuckets.get(key) || { hits: [], banUntil: 0 }
  if (bucket.banUntil > now) return
  bucket.hits = [...bucket.hits.filter(ts => now - ts < passportHour), now]
  passportBuckets.set(key, bucket)
}
