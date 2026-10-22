import { isRecordId } from '../record-id'
import { FORM_SOURCES, OPTIMIZATION_PLACEMENTS, type FormSource, type OptimizationPlacement } from './placements'

export const OPTIMIZATION_SCHEMA_VERSION = 1 as const
export const MAX_EVENT_BATCH_SIZE = 20
export const MAX_EVENT_BODY_BYTES = 32_768
export const MAX_EVENT_AGE_MS = 24 * 60 * 60 * 1000
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000

export type OptimizationRegion = 'nn' | 'msk'
export type OptimizationMode = 'manual' | 'hybrid' | 'automatic'
export type SelectionOrigin = 'manual' | 'exploration' | 'posterior' | 'fallback'
export type DeviceClass = 'mobile' | 'desktop' | 'tablet'
export type ClientEventType = 'project_impression' | 'project_opened' | 'project_shared' | 'form_opened' | 'regional_context_changed'
export type ServerEventType = 'ranking_assigned' | 'project_liked' | 'project_unliked' | 'lead_accepted' | 'lead_delivery_updated'

type EventBase = {
  event_id: string
  occurred_at: string
  region: OptimizationRegion
  device_class: DeviceClass
}
type ProjectContext = {
  project_code: string
  placement: OptimizationPlacement
  decision_id?: string
  exposure_id?: string
  slot_position?: number
}
export type ClientOptimizationEvent =
  | (EventBase & ProjectContext & { event_type: 'project_impression'; decision_id: string; exposure_id: string; slot_position: number })
  | (EventBase & ProjectContext & { event_type: 'project_opened' })
  | (EventBase & ProjectContext & { event_type: 'project_shared'; share_method: 'web_share' | 'copy' })
  | (EventBase & { event_type: 'form_opened'; form_id: string; source_component: FormSource; project_code?: string; decision_id?: string; exposure_id?: string; slot_position?: number; placement?: OptimizationPlacement })
  | (EventBase & { event_type: 'regional_context_changed'; previous_region: OptimizationRegion })

export type EventBatch = {
  schema_version: typeof OPTIMIZATION_SCHEMA_VERSION
  batch_id: string
  decision_token?: string
  events: ClientOptimizationEvent[]
}
export type DecisionItem = { project_code: string; slot_position: number; origin: SelectionOrigin }
export type PopularDecisionResult =
  | { status: 'hidden'; reason: 'catalog_authority_unavailable' }
  | { status: 'ready' | 'shortfall'; decision_id: string; region: OptimizationRegion; items: DecisionItem[]; policy_version: string; expires_at: string }

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const eventTypes: readonly string[] = ['project_impression', 'project_opened', 'project_shared', 'form_opened', 'regional_context_changed']
const baseKeys = ['event_id', 'event_type', 'occurred_at', 'region', 'device_class']
const projectKeys = ['project_code', 'placement', 'decision_id', 'exposure_id', 'slot_position']
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const region = (value: unknown): value is OptimizationRegion => value === 'nn' || value === 'msk'
const isUuid = (value: unknown) => typeof value === 'string' && uuid.test(value)
const shortText = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max

/** Pure browser contract. Server-only facts, identities, URLs and free-form metadata are never accepted here. */
export function parseClientEvent(value: unknown, now = Date.now()): ValidationResult<ClientOptimizationEvent> {
  const fail = (reason: string): ValidationResult<ClientOptimizationEvent> => ({ ok: false, reason })
  if (!record(value) || !eventTypes.includes(String(value.event_type))) return fail('event_type')
  const type = value.event_type
  const extra = type === 'regional_context_changed' ? ['previous_region']
    : type === 'form_opened' ? [...projectKeys, 'form_id', 'source_component']
      : [...projectKeys, ...(type === 'project_shared' ? ['share_method'] : [])]
  if (Object.keys(value).some(key => ![...baseKeys, ...extra].includes(key))) return fail('unknown_field')
  if (!isUuid(value.event_id)) return fail('event_id')
  if (!region(value.region)) return fail('region')
  if (!['mobile', 'desktop', 'tablet'].includes(String(value.device_class))) return fail('device_class')
  if (typeof value.occurred_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.occurred_at)) return fail('occurred_at')
  const time = Date.parse(value.occurred_at)
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 19) !== value.occurred_at.slice(0, 19)) return fail('occurred_at')
  if (time > now + MAX_CLOCK_SKEW_MS || time < now - MAX_EVENT_AGE_MS) return fail('event_time_window')
  if (type === 'regional_context_changed') {
    if (!region(value.previous_region) || value.previous_region === value.region) return fail('previous_region')
  } else {
    if (value.project_code !== undefined && !isRecordId(value.project_code)) return fail('project_code')
    if (value.decision_id !== undefined && !isUuid(value.decision_id)) return fail('decision_id')
    if (value.exposure_id !== undefined && !isUuid(value.exposure_id)) return fail('exposure_id')
    if (value.slot_position !== undefined && (!Number.isInteger(value.slot_position) || Number(value.slot_position) < 1 || Number(value.slot_position) > 6)) return fail('slot_position')
    if (value.placement !== undefined && !(OPTIMIZATION_PLACEMENTS as readonly unknown[]).includes(value.placement)) return fail('placement')
    if (type !== 'form_opened' && (!isRecordId(value.project_code) || value.placement === undefined)) return fail('project_context')
    const hasRankingContext = value.decision_id !== undefined || value.exposure_id !== undefined || value.slot_position !== undefined
    if (hasRankingContext && (!isUuid(value.decision_id) || !isUuid(value.exposure_id) || value.slot_position === undefined || !isRecordId(value.project_code) || value.placement !== 'home.popular_projects')) return fail('ranking_context')
    if (type === 'project_impression' && !hasRankingContext) return fail('ranking_context')
    if (type === 'project_shared' && !['copy', 'web_share'].includes(String(value.share_method))) return fail('share_method')
    if (type === 'form_opened' && (!shortText(value.form_id, 120) || !/^[A-Za-z0-9_-]+$/.test(String(value.form_id)) || !(FORM_SOURCES as readonly unknown[]).includes(value.source_component))) return fail('form_context')
  }
  // Constructed from an allowlisted JSON record, never a caller-owned mutable reference.
  return { ok: true, value: { ...value } as ClientOptimizationEvent }
}

export function parseEventBatch(value: unknown, now = Date.now()): ValidationResult<EventBatch> {
  if (!record(value) || Object.keys(value).some(key => !['schema_version', 'batch_id', 'decision_token', 'events'].includes(key))) return { ok: false, reason: 'batch_fields' }
  if (value.schema_version !== OPTIMIZATION_SCHEMA_VERSION || !isUuid(value.batch_id)) return { ok: false, reason: 'batch_version_or_id' }
  if (value.decision_token !== undefined && (!shortText(value.decision_token, 2048) || !/^[A-Za-z0-9._-]+$/.test(String(value.decision_token)))) return { ok: false, reason: 'decision_token' }
  if (!Array.isArray(value.events) || value.events.length === 0 || value.events.length > MAX_EVENT_BATCH_SIZE) return { ok: false, reason: 'batch_size' }
  const events: ClientOptimizationEvent[] = []
  for (const event of value.events) {
    const parsed = parseClientEvent(event, now)
    if (!parsed.ok) return parsed
    events.push(parsed.value)
  }
  if (events.some(event => 'decision_id' in event && event.decision_id) && !value.decision_token) return { ok: false, reason: 'decision_token_required' }
  if (new Set(events.map(event => event.event_id)).size !== events.length) return { ok: false, reason: 'duplicate_event_id' }
  return { ok: true, value: { schema_version: 1, batch_id: value.batch_id as string, ...(value.decision_token ? { decision_token: value.decision_token as string } : {}), events } }
}

/** Route boundary: apply to the bounded raw body, before parsing untrusted JSON. */
export function decodeEventBatch(body: string, now = Date.now()): ValidationResult<EventBatch> {
  if (new TextEncoder().encode(body).byteLength > MAX_EVENT_BODY_BYTES) return { ok: false, reason: 'body_size' }
  try { return parseEventBatch(JSON.parse(body), now) } catch { return { ok: false, reason: 'bad_json' } }
}
