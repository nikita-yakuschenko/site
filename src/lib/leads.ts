import { z } from 'zod'

export const leadInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(32)
    .regex(/^[+\d][\d\s()-]{8,}$/),
  siteId: z.number().int().positive(),
  pageId: z.number().int().positive().optional(),
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
