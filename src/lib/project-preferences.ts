import { isRecordId } from './record-id'
import { parsePreferenceState, parsePreferenceSync, type PreferenceState, type PreferenceSource, type SetPreferenceInput } from './optimization/preferences-contracts'

export const PREFERENCE_MIGRATION_KEY = 'avgst:preferences:migration:v1'
export const PREFERENCE_MIGRATION_DONE_KEY = 'avgst:preferences:imported:v1'
export const PREFERENCE_NOTICE_KEY = 'avgst:preferences:changed'
const LEGACY_KEY = 'avgst:favorites'
type Entry = { state?: PreferenceState; desired?: boolean; operation?: SetPreferenceInput; busy?: boolean; error?: boolean; unavailable?: boolean }
export type PreferenceView = { liked: boolean; count?: number; pending: boolean; error: boolean; unavailable: boolean }
type StorageAccess = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Dependencies = { fetch: typeof fetch; uuid: () => string; storage: () => StorageAccess | undefined; changed?: () => void }
type Migration = { migration_id: string; legacy_ids: string[] }

/** One store per mounted root. No browser identifiers or state in the server module scope. */
export class ProjectPreferencesStore {
  private entries = new Map<string, Entry>()
  private registered = new Map<string, number>()
  private listeners = new Set<() => void>()
  private version = 0
  private active = false
  private generation = 0
  private controller = new AbortController()
  private boot?: Promise<void>
  private hydrated = new Set<string>()
  private scheduled = false
  private migration?: Migration
  private migrationDone = false
  constructor(private deps: Dependencies) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.version
  serverSnapshot = () => 0
  private emit() { this.version++; for (const listener of this.listeners) listener() }
  private storage() { try { return this.deps.storage() } catch { return undefined } }
  private read(key: string) { try { return this.storage()?.getItem(key) ?? null } catch { return null } }
  private write(key: string, value: string) { try { this.storage()?.setItem(key, value) } catch { /* Memory-only works with blocked storage. */ } }
  setActive(active: boolean) {
    if (this.active === active) return
    this.active = active
    this.generation++
    this.controller.abort()
    this.controller = new AbortController()
    this.boot = undefined
    this.entries.clear()
    this.hydrated.clear()
    this.migration = undefined
    this.migrationDone = false
    this.emit()
    if (active) this.schedule()
  }
  register(code: string) {
    if (!isRecordId(code)) return () => {}
    this.registered.set(code, (this.registered.get(code) ?? 0) + 1)
    this.schedule()
    return () => { const count = (this.registered.get(code) ?? 1) - 1; if (count) this.registered.set(code, count); else this.registered.delete(code) }
  }
  view(code: string): PreferenceView {
    if (!isRecordId(code)) return { liked: false, pending: false, error: false, unavailable: true }
    const entry = this.entries.get(code)
    const state = entry?.state
    const liked = entry?.desired ?? state?.liked ?? false
    return { liked, count: state ? Math.max(0, state.likeCount + (state.reconciliation !== 'ready' || liked === state.liked ? 0 : liked ? 1 : -1)) : undefined, pending: Boolean(entry?.busy || entry?.desired !== undefined), error: Boolean(entry?.error), unavailable: Boolean(entry?.unavailable) }
  }
  favorites() { return [...this.entries.keys()].filter(code => this.view(code).liked && !this.entries.get(code)?.unavailable) }
  private merge(state: PreferenceState) {
    const entry = this.entries.get(state.project_code) ?? {}
    if (!entry.state || state.revision >= entry.state.revision) {
      entry.state = state
      entry.unavailable = false
      if (entry.desired === undefined && !entry.operation) entry.error = false
      this.entries.set(state.project_code, entry)
    }
  }
  private async request(path: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
    const generation = this.generation
    if (!this.active) throw new Error('inactive')
    const response = await this.deps.fetch(path, { ...init, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(12_000)]) })
    const body = await response.json() as Record<string, unknown>
    if (!this.active || generation !== this.generation) throw new Error('obsolete')
    if (!body || typeof body !== 'object') throw new Error('invalid_response')
    return { status: response.status, body }
  }
  private async list() {
    let after: string | null = null
    const seen = new Set<string>()
    do {
      const result = await this.request('/api/projects/likes/list' + (after ? `?after=${encodeURIComponent(after)}` : ''))
      if (result.status !== 200 || !Array.isArray(result.body.items)) throw new Error('list_failed')
      for (const item of result.body.items) { const state = parsePreferenceState(item); if (!state) throw new Error('invalid_list'); this.merge(state) }
      const next = result.body.next_cursor
      if (next !== null && (!isRecordId(next) || seen.has(next))) throw new Error('invalid_cursor')
      after = next as string | null
      if (after) seen.add(after)
    } while (after)
  }
  private async migrate() {
    if (this.migrationDone) return
    let legacy: string[] = []
    const acknowledged = new Set<string>()
    try { const saved: unknown = JSON.parse(this.read(PREFERENCE_MIGRATION_DONE_KEY) ?? '[]'); if (Array.isArray(saved)) for (const id of saved) { if (typeof id === 'string' && /^[A-Za-z0-9:-]{1,120}$/.test(id)) acknowledged.add(id) } } catch { /* Retry safely against canonical rows. */ }
    try { const parsed: unknown = JSON.parse(this.read(LEGACY_KEY) ?? '[]'); if (Array.isArray(parsed)) legacy = [...new Set(parsed.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9:-]{1,120}$/.test(id)))] } catch { /* Invalid old storage is retained. */ }
    legacy = legacy.filter(id => !acknowledged.has(id))
    if (!this.migration) {
      try {
        const saved = parsePreferenceSync(JSON.parse(this.read(PREFERENCE_MIGRATION_KEY) ?? 'null'))
        if (saved) this.migration = saved
      } catch { /* Recover using original legacy data. */ }
    }
    while (this.migration || legacy.length) {
      const batch = this.migration ?? { migration_id: this.deps.uuid(), legacy_ids: legacy.slice(0, 100) }
      this.migration = batch
      this.write(PREFERENCE_MIGRATION_KEY, JSON.stringify(batch))
      const result = await this.request('/api/projects/likes/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch) })
      if (result.status !== 200 || !Array.isArray(result.body.items)) throw new Error('migration_failed')
      const synced = new Set<string>()
      const confirmed = new Set<string>()
      for (const item of result.body.items as { legacy_id: string; result: string; state?: unknown }[]) {
        if (!item || !batch.legacy_ids.includes(item.legacy_id) || !['synced', 'unknown', 'ambiguous', 'unavailable', 'requires_baseline'].includes(item.result)) throw new Error('invalid_migration')
        const state = parsePreferenceState(item.state)
        if (item.result === 'synced' && !state) throw new Error('invalid_migration_state')
        if (item.result !== 'requires_baseline') confirmed.add(item.legacy_id)
        if (item.result === 'synced' && state) { this.merge(state); synced.add(item.legacy_id) }
      }
      this.emit()
      // Do not erase local data or a retry receipt until the whole batch is acknowledged.
      if (result.body.completed !== true || confirmed.size !== batch.legacy_ids.length) throw new Error('migration_pending')
      for (const id of batch.legacy_ids) acknowledged.add(id)
      this.write(PREFERENCE_MIGRATION_DONE_KEY, JSON.stringify([...acknowledged]))
      try {
        const current: unknown = JSON.parse(this.read(LEGACY_KEY) ?? '[]')
        if (Array.isArray(current)) this.storage()?.setItem(LEGACY_KEY, JSON.stringify(current.filter(id => !synced.has(id))))
        this.storage()?.removeItem(PREFERENCE_MIGRATION_KEY)
      } catch { /* A repeated import is harmless: the server owns deduplication. */ }
      legacy = legacy.filter(id => !batch.legacy_ids.includes(id))
      this.migration = undefined
    }
    this.migrationDone = true
  }
  private initialize() {
    if (!this.boot) {
      const generation = this.generation
      this.boot = (async () => {
        // A single first GET establishes the signed cookie before concurrent batches/writes.
        await this.list()
        await this.migrate()
      })().catch(error => { if (generation === this.generation) this.boot = undefined; throw error })
    }
    return this.boot
  }
  private async batch(codes: string[]) {
    for (let offset = 0; offset < codes.length; offset += 100) {
      const chunk = codes.slice(offset, offset + 100)
      const result = await this.request(`/api/projects/likes?codes=${chunk.join(',')}`)
      if (result.status !== 200 || !Array.isArray(result.body.items)) throw new Error('batch_failed')
      for (const item of result.body.items) {
        const state = parsePreferenceState(item)
        if (state && chunk.includes(state.project_code)) { this.merge(state); this.hydrated.add(state.project_code) }
        else if (item && typeof item === 'object' && 'project_code' in item && 'unavailable' in item && item.unavailable === true && chunk.includes(String(item.project_code))) {
          this.entries.set(String(item.project_code), { unavailable: true }); this.hydrated.add(String(item.project_code))
        }
      }
    }
  }
  private schedule() {
    if (!this.active || this.scheduled) return
    this.scheduled = true
    queueMicrotask(() => { this.scheduled = false; void this.hydrate() })
  }
  private async hydrate() {
    if (!this.active) return
    const generation = this.generation
    try {
      await this.initialize()
      await this.batch([...this.registered.keys()].filter(code => !this.hydrated.has(code)))
      if (generation === this.generation) this.emit()
    } catch {
      if (generation !== this.generation) return
      for (const code of this.registered.keys()) { const entry = this.entries.get(code) ?? {}; entry.error = true; this.entries.set(code, entry) }
      this.emit()
    }
  }
  async refresh() {
    if (!this.active) return
    const generation = this.generation
    try {
      await this.initialize()
      await this.list()
      await this.batch([...new Set([...this.registered.keys(), ...this.entries.keys()])])
      if (generation === this.generation) this.emit()
    } catch { /* Keep the last confirmed state during outages. */ }
  }
  setLiked(code: string, liked: boolean, source: PreferenceSource) {
    if (!this.active || !isRecordId(code)) return
    const entry = this.entries.get(code) ?? {}
    if (entry.unavailable) return
    entry.desired = liked
    entry.error = false
    this.entries.set(code, entry)
    this.emit()
    void this.drain(code, source)
  }
  retry(code: string, source: PreferenceSource) {
    if (!this.active) return
    const entry = this.entries.get(code)
    if (entry?.desired !== undefined) { entry.error = false; void this.drain(code, source) }
    else { this.hydrated.delete(code); this.boot = undefined; this.schedule() }
  }
  private async drain(code: string, source: PreferenceSource) {
    const entry = this.entries.get(code)!
    if (entry.busy) return
    const generation = this.generation
    entry.busy = true
    this.emit()
    try {
      await this.initialize()
      if (!entry.state) await this.batch([code])
      // Hydration merges into the existing entry, including the user's queued intent.
      if (!entry.state || entry.unavailable) throw new Error('unavailable')
      let conflicts = 0
      let identityRetries = 0
      while (entry.desired !== undefined || entry.operation) {
        if (!entry.operation && entry.desired === entry.state.liked) { entry.desired = undefined; break }
        const operation = entry.operation ?? { liked: entry.desired!, expected_revision: entry.state.revision, operation_id: this.deps.uuid(), source }
        entry.operation = operation
        const result = await this.request(`/api/projects/${code}/like`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) })
        if (result.status === 428 && identityRetries++ < 1) continue // Same operation; response established identity.
        if (result.status === 409 && result.body.error === 'stale_revision') {
          const current = parsePreferenceState(result.body.current)
          if (!current || current.project_code !== code) throw new Error('invalid_conflict')
          this.merge(current)
          entry.operation = undefined
          if (++conflicts > 1) throw new Error('conflict')
          continue
        }
        const state = parsePreferenceState(result.body)
        if (result.status !== 200 || !state || state.project_code !== code) throw new Error('write_failed')
        this.merge(state)
        entry.operation = undefined
        if (entry.desired === operation.liked) entry.desired = undefined
        entry.error = false
        this.deps.changed?.()
        this.emit()
      }
    } catch { if (generation === this.generation) entry.error = true }
    finally { if (generation === this.generation) { entry.busy = false; this.emit() } }
  }
}
