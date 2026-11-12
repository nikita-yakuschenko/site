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

type PassportHit = { at: number; device: string; scrape: boolean }
type PassportBucket = { hits: PassportHit[]; bans: Record<string, number> }
const passportBuckets = new Map<string, PassportBucket>()
const passportHour = 60 * 60 * 1000
const passportDay = 24 * 60 * 60 * 1000
const passportBan = 3 * 60 * 60 * 1000
const quickVisit = 15 * 1000

export type PassportPlan = 'ok' | 'nudge' | 'joke' | 'banned'
export type PassportSignal = { device: string; dwellMs: number; leftFast: boolean }

function passportBucket(key: string, now: number) {
  for (const [id, value] of passportBuckets) {
    const banActive = Object.values(value.bans).some(until => until > now)
    if (!banActive && !value.hits.some(hit => now - hit.at < passportDay)) passportBuckets.delete(id)
  }
  if (!passportBuckets.has(key) && passportBuckets.size >= 10000) return null
  const bucket = passportBuckets.get(key) || { hits: [], bans: {} }
  bucket.hits = bucket.hits.filter(hit => now - hit.at < passportDay)
  for (const device of Object.keys(bucket.bans)) if ((bucket.bans[device] || 0) <= now) delete bucket.bans[device]
  passportBuckets.set(key, bucket)
  return bucket
}

function looksLikeScrape(signal: PassportSignal) {
  return /^[a-f0-9]{32}$/.test(signal.device) && signal.dwellMs >= 0 && signal.dwellMs < quickVisit && signal.leftFast
}

function scrapeRun(hits: PassportHit[], signal: PassportSignal) {
  if (!looksLikeScrape(signal)) return 0
  let run = 1
  for (let index = hits.length - 1; index >= 0; index -= 1) {
    const hit = hits[index]
    if (!hit?.scrape || hit.device !== signal.device) break
    run += 1
  }
  return run
}

// Пятый паспорт этого устройства за час просит замедлиться, файл остаётся настоящим. Шутка и бан — только у того же адреса и устройства, если заходы короткие и страница сразу покидается.
export function planPassportDownload(key: string, signal: PassportSignal, now = Date.now()): PassportPlan {
  const bucket = passportBucket(key, now)
  if (!bucket) return 'banned'
  if ((bucket.bans[signal.device] || 0) > now) return 'banned'
  const ownHour = bucket.hits.filter(hit => hit.device === signal.device && now - hit.at < passportHour)
  const run = scrapeRun(ownHour, signal)
  if (ownHour.length >= 9 && run >= 3) {
    bucket.bans[signal.device] = now + passportBan
    passportBuckets.set(key, bucket)
    return 'banned'
  }
  if (ownHour.length >= 5 && run >= 3) return 'joke'
  if (ownHour.length >= 4) return 'nudge'
  return 'ok'
}

// Повторные заявки одного устройства не создаются. Чужое устройство в той же сети сохраняет свою заявку.
export function passportSkipsLead(key: string, signal: PassportSignal, now = Date.now()) {
  const bucket = passportBucket(key, now)
  if (!bucket) return true
  const day = bucket.hits.filter(hit => now - hit.at < passportDay)
  if (day.filter(hit => hit.device === signal.device).length >= 2) return true
  return looksLikeScrape(signal) && day.filter(hit => hit.scrape).length >= 2
}

export function notePassportDownload(key: string, signal: PassportSignal) {
  const now = Date.now()
  const bucket = passportBucket(key, now)
  if (!bucket || (bucket.bans[signal.device] || 0) > now) return
  bucket.hits.push({ at: now, device: signal.device, scrape: looksLikeScrape(signal) })
  passportBuckets.set(key, bucket)
}
