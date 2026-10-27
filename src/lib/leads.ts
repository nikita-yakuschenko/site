import { z } from 'zod'
import { recordIdPattern } from './record-id'

export const leadInputSchema = z.object({
  requestId: z.string().uuid().optional(),
  captchaToken: z.string().trim().min(1).max(4096).optional(),
  name: z.string().trim().min(2).max(120),
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
