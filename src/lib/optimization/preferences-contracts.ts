import { isRecordId } from '../record-id'

export const PREFERENCE_BATCH_LIMIT = 100
export const PREFERENCE_BODY_LIMIT = 16_384
export const operationIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const voterKeyPattern = /^c:[a-f0-9]{32}$/
export const fingerprintKeyPattern = /^f:[a-f0-9]{64}$/
export type PreferenceSource = 'project_card' | 'project_actions' | 'legacy_api'
export type PreferenceState = {
  project_code: string
  liked: boolean
  likeCount: number
  revision: number
  reconciliation: 'ready' | 'pending' | 'required'
}
export type SetPreferenceInput = { liked: boolean; operation_id: string; expected_revision: number; source: PreferenceSource }
export type PreferenceReply = { status: number; body: PreferenceState | { error: string; current?: PreferenceState } }
export type PreferenceSyncInput = { migration_id: string; legacy_ids: string[] }
export const isPreferenceSource = (value: unknown): value is PreferenceSource => ['project_card', 'project_actions', 'legacy_api'].includes(String(value))
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const nonnegativeInteger = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0

export function parsePreferenceState(v: unknown): PreferenceState | null {
  if (!object(v) || !isRecordId(v.project_code) || typeof v.liked !== 'boolean' || !nonnegativeInteger(v.likeCount) || !nonnegativeInteger(v.revision) || !['ready', 'pending', 'required'].includes(String(v.reconciliation))) return null
  return { project_code: v.project_code, liked: v.liked, likeCount: Number(v.likeCount), revision: Number(v.revision), reconciliation: v.reconciliation as PreferenceState['reconciliation'] }
}

/** Strip upstream data to the public contract; never forward debug objects/cookies/secrets. */
export function publicPreferenceResponse(action: 'batch' | 'set' | 'sync' | 'list' | 'legacy', body: unknown, status: number): Record<string, unknown> | null {
  if (!object(body)) return null
  if (status !== 200) {
    if (!['invalid_input', 'body_size', 'bad_json', 'operation_id', 'revision', 'operation_conflict', 'migration_conflict', 'stale_revision', 'project_unavailable', 'reconciliation_required', 'baseline_changed', 'preferences_unavailable', 'preferences_disabled', 'preferences_not_configured', 'browser_identity_required'].includes(String(body.error))) return null
    const current = body.current === undefined ? undefined : parsePreferenceState(body.current)
    if (current === null) return null
    return { error: body.error, ...(current ? { current } : {}) }
  }
  if (action === 'set') return parsePreferenceState(body)
  if (action === 'legacy') {
    if (!nonnegativeInteger(body.likes) || !nonnegativeInteger(body.shares) || !nonnegativeInteger(body.revision) || typeof body.liked !== 'boolean') return null
    return { likes: body.likes, shares: body.shares, revision: body.revision, liked: body.liked }
  }
  if (!Array.isArray(body.items) || body.items.length > PREFERENCE_BATCH_LIMIT) return null
  if (action === 'sync') {
    if (typeof body.completed !== 'boolean') return null
    const items = []
    for (const item of body.items) {
      if (!object(item) || typeof item.legacy_id !== 'string' || !/^[A-Za-z0-9:-]{1,120}$/.test(item.legacy_id) || !['synced', 'unknown', 'ambiguous', 'unavailable', 'requires_baseline'].includes(String(item.result))) return null
      const state = item.state === undefined ? undefined : parsePreferenceState(item.state)
      if (state === null || (item.result === 'synced' && !state)) return null
      items.push({ legacy_id: item.legacy_id, result: item.result, ...(state ? { state } : {}) })
    }
    return { completed: body.completed, items }
  }
  const items = []
  for (const item of body.items) {
    const state = parsePreferenceState(item)
    if (state) items.push(state)
    else if (object(item) && isRecordId(item.project_code) && item.unavailable === true) items.push({ project_code: item.project_code, unavailable: true })
    else return null
  }
  if (action === 'list') {
    if (body.next_cursor !== null && !isRecordId(body.next_cursor)) return null
    return { items, next_cursor: body.next_cursor }
  }
  return { items }
}

export function parseSetPreference(v: unknown): SetPreferenceInput | null {
  if (!object(v) || Object.keys(v).some(k => !['liked', 'operation_id', 'expected_revision', 'source'].includes(k))) return null
  if (typeof v.liked !== 'boolean' || typeof v.operation_id !== 'string' || !operationIdPattern.test(v.operation_id) || !Number.isSafeInteger(v.expected_revision) || Number(v.expected_revision) < 0 || !isPreferenceSource(v.source)) return null
  return { liked: v.liked, operation_id: v.operation_id.toLowerCase(), expected_revision: Number(v.expected_revision), source: v.source }
}

export function parsePreferenceCodes(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > PREFERENCE_BATCH_LIMIT || !value.every(isRecordId)) return null
  return [...new Set(value)]
}

export function parsePreferenceSync(v: unknown): PreferenceSyncInput | null {
  if (!object(v) || Object.keys(v).some(k => !['migration_id', 'legacy_ids'].includes(k)) || typeof v.migration_id !== 'string' || !operationIdPattern.test(v.migration_id)) return null
  if (!Array.isArray(v.legacy_ids) || v.legacy_ids.length < 1 || v.legacy_ids.length > PREFERENCE_BATCH_LIMIT || !v.legacy_ids.every(id => typeof id === 'string' && /^[A-Za-z0-9:-]{1,120}$/.test(id))) return null
  return { migration_id: v.migration_id.toLowerCase(), legacy_ids: [...new Set(v.legacy_ids as string[])] }
}
