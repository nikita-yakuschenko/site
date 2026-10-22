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
  meta: z.record(z.string(), z.unknown()).optional(),
  projectExternalId: z.string().trim().max(120).optional(),
  sourcePath: z.string().trim().max(500).optional(),
  consent: z.literal(true),
})

export type LeadInput = z.infer<typeof leadInputSchema>

type Bucket = { hits: number[]; }

const buckets = new Map<string, Bucket>()

export function allowLeadAttempt(key: string, limit = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now()
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
