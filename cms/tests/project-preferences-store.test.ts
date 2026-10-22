import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { ProjectPreferencesStore, PREFERENCE_MIGRATION_KEY, PREFERENCE_MIGRATION_DONE_KEY } from '../../src/lib/project-preferences'
import type { PreferenceState, SetPreferenceInput } from '../../src/lib/optimization/preferences-contracts'

const code = 'ABCDEF12'
const initial = (): PreferenceState => ({ project_code: code, liked: false, likeCount: 8, revision: 0, reconciliation: 'ready' })
async function until(check: () => boolean) { for (let i = 0; i < 300; i++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 2)) } assert.fail('store did not settle') }
function setup(options: { legacy?: string[]; blocked?: boolean } = {}) {
  let state = initial()
  const values = new Map<string, string>()
  if (options.legacy) values.set('avgst:favorites', JSON.stringify(options.legacy))
  const requests: { path: string; body?: SetPreferenceInput & { migration_id?: string } }[] = []
  const receipts = new Map<string, PreferenceState>()
  let intercept: ((path: string, body: Record<string, unknown>) => Promise<Response | undefined>) | undefined
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input)
    const body = JSON.parse(String(init?.body ?? '{}'))
    requests.push({ path, body })
    const intercepted = await intercept?.(path, body)
    if (intercepted) return intercepted
    if (path.includes('/list')) return Response.json({ items: state.liked ? [state] : [], next_cursor: null })
    if (path.includes('?codes=')) return Response.json({ items: [state] })
    if (path.endsWith('/sync')) {
      if (!state.revision) state = { ...state, liked: true, revision: 1 }
      return Response.json({ completed: true, items: body.legacy_ids.map((id: string) => ({ legacy_id: id, result: 'synced', state })) })
    }
    if (receipts.has(body.operation_id)) return Response.json(receipts.get(body.operation_id))
    if (body.expected_revision !== state.revision) return Response.json({ error: 'stale_revision', current: state }, { status: 409 })
    state = { ...state, liked: body.liked, likeCount: state.likeCount + (body.liked === state.liked ? 0 : body.liked ? 1 : -1), revision: state.revision + 1 }
    receipts.set(body.operation_id, { ...state })
    return Response.json(state)
  }
  const store = new ProjectPreferencesStore({ fetch: fetcher as typeof fetch, uuid: randomUUID, storage: () => { if (options.blocked) throw new Error('SecurityError'); return storage } })
  return { store, values, requests, receipts, state: () => state, update: (value: PreferenceState) => { state = value }, intercept: (fn: typeof intercept) => { intercept = fn } }
}

test('cards, page and favorites share one optimistic state; registration batches reads', async () => {
  const s = setup()
  s.store.register(code); s.store.register(code)
  s.store.setActive(true)
  await until(() => s.store.view(code).count === 8)
  assert.equal(s.requests.filter(r => r.path.includes('?codes=')).length, 1)
  s.store.setLiked(code, true, 'project_card')
  assert.equal(s.store.view(code).count, 9)
  assert.deepEqual(s.store.favorites(), [code])
  await until(() => !s.store.view(code).pending)
  assert.equal(s.state().revision, 1)
  s.store.setLiked(code, false, 'project_actions')
  await until(() => !s.store.view(code).pending)
  assert.equal(s.store.view(code).count, 8)
  assert.deepEqual(s.store.favorites(), [])
})

test('rapid clicks serialize writes and keep only the last queued intent', async () => {
  const s = setup(); s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).count === 8)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  let mutations = 0
  s.intercept(async path => { if (path.endsWith('/like') && ++mutations === 1) await gate; return undefined })
  s.store.setLiked(code, true, 'project_card')
  await until(() => mutations === 1)
  s.store.setLiked(code, false, 'project_actions')
  s.store.setLiked(code, true, 'project_card')
  s.store.setLiked(code, false, 'project_card')
  assert.equal(mutations, 1)
  release()
  await until(() => !s.store.view(code).pending)
  assert.equal(s.state().liked, false)
  assert.equal(mutations, 2)
  assert.equal(s.state().likeCount, 8)
})

test('lost response retries the same operation without losing local intent or double counting', async () => {
  const s = setup(); s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).count === 8)
  let lost = false
  s.intercept(async (path, body) => {
    if (path.endsWith('/like') && !lost) {
      lost = true
      const state = { ...initial(), liked: true, likeCount: 9, revision: 1 }
      s.update(state); s.receipts.set(String(body.operation_id), state)
      throw new Error('connection lost after commit')
    }
    return undefined
  })
  s.store.setLiked(code, true, 'project_card')
  await until(() => s.store.view(code).error)
  assert.equal(s.store.view(code).liked, true)
  s.store.retry(code, 'project_card')
  await until(() => !s.store.view(code).pending)
  const writes = s.requests.filter(r => r.path.endsWith('/like'))
  assert.equal(writes[0].body?.operation_id, writes[1].body?.operation_id)
  assert.equal(s.state().likeCount, 9)
  assert.equal(s.store.view(code).error, false)
})

test('stale tabs rebase CAS and an older replay never replaces a newer confirmed revision', async () => {
  const s = setup(); s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).count === 8)
  s.update({ ...initial(), revision: 2 })
  s.store.setLiked(code, true, 'project_card')
  await until(() => !s.store.view(code).pending)
  assert.equal(s.state().revision, 3)
  assert.equal(s.requests.filter(r => r.path.endsWith('/like')).length, 2)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  s.intercept(async path => {
    if (path.endsWith('/like')) { await gate; return Response.json({ ...initial(), revision: 4 }) }
    return undefined
  })
  s.store.setLiked(code, false, 'project_card')
  await until(() => s.requests.filter(r => r.path.endsWith('/like')).length === 3)
  s.update({ ...initial(), liked: true, likeCount: 9, revision: 5 })
  await s.store.refresh()
  release()
  await until(() => !s.store.view(code).pending)
  assert.equal(s.store.view(code).liked, true)
  assert.equal(s.store.view(code).count, 9)
})

test('migration persists its receipt before send, retains data on timeout and confirms without rewards', async () => {
  const s = setup({ legacy: ['old-slug', 'cms:7'] })
  let fail = true
  let migrationId: string | undefined
  s.intercept(async (path, body) => {
    if (path.endsWith('/sync')) {
      migrationId ??= String(body.migration_id)
      assert.equal(body.migration_id, migrationId)
      assert.equal(JSON.parse(s.values.get(PREFERENCE_MIGRATION_KEY)!).migration_id, migrationId)
      if (fail) throw new Error('offline')
    }
    return undefined
  })
  s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).error)
  assert.deepEqual(JSON.parse(s.values.get('avgst:favorites')!), ['old-slug', 'cms:7'])
  fail = false
  s.store.retry(code, 'project_card')
  await until(() => s.store.view(code).liked && !s.store.view(code).error)
  assert.deepEqual(JSON.parse(s.values.get('avgst:favorites')!), [])
  assert.equal(s.values.has(PREFERENCE_MIGRATION_KEY), false)
  assert.equal(s.requests.filter(r => r.path.endsWith('/like')).length, 0)
  assert.equal(s.state().likeCount, 8)
})

test('blocked storage still supports bootstrap and mutations; 428 retries exactly the same body', async () => {
  const s = setup({ blocked: true }); let first = true
  s.intercept(async path => { if (path.endsWith('/like') && first) { first = false; return Response.json({ error: 'identity_required' }, { status: 428 }) } return undefined })
  s.store.register(code); s.store.setActive(true)
  s.store.setLiked(code, true, 'project_actions')
  await until(() => !s.store.view(code).pending)
  assert.equal(s.requests[0].path, '/api/projects/likes/list')
  const writes = s.requests.filter(r => r.path.endsWith('/like'))
  assert.deepEqual(writes[0].body, writes[1].body)
  assert.equal(s.state().likeCount, 9)
})

test('revocation stops requests and ignores late responses; invalid project IDs never mutate', async () => {
  const s = setup(); s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).count === 8)
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  s.intercept(async path => { if (path.endsWith('/like')) await gate; return undefined })
  s.store.setLiked(code, true, 'project_card')
  await until(() => s.requests.some(r => r.path.endsWith('/like')))
  s.store.setActive(false)
  release()
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.deepEqual(s.store.favorites(), [])
  assert.equal(s.store.view(code).count, undefined)
  const before = s.requests.length
  s.store.setLiked(code, true, 'project_actions')
  s.store.setLiked('legacy-id', true, 'project_card')
  await s.store.refresh()
  assert.equal(s.requests.length, before)
  assert.equal(s.store.view('legacy-id').unavailable, true)
})

test('partial migration retains both original IDs and the same receipt; unresolved IDs are retained after acknowledgement', async () => {
  const s = setup({ legacy: ['old-slug', 'ambiguous-slug'] }); let completed = false
  const ids: string[] = []
  s.intercept(async (path, body) => {
    if (!path.endsWith('/sync')) return undefined
    ids.push(String(body.migration_id))
    const state = { ...initial(), liked: true, reconciliation: 'pending' as const, revision: 1 }
    s.update(state)
    return Response.json({ completed, items: [{ legacy_id: 'old-slug', result: 'synced', state }, { legacy_id: 'ambiguous-slug', result: completed ? 'ambiguous' : 'requires_baseline' }] })
  })
  s.store.register(code); s.store.setActive(true)
  await until(() => s.store.view(code).error)
  assert.deepEqual(JSON.parse(s.values.get('avgst:favorites')!), ['old-slug', 'ambiguous-slug'])
  assert.equal(s.values.has(PREFERENCE_MIGRATION_DONE_KEY), false)
  completed = true
  s.store.retry(code, 'project_card')
  await until(() => !s.store.view(code).error)
  assert.equal(ids[0], ids[1])
  assert.deepEqual(JSON.parse(s.values.get('avgst:favorites')!), ['ambiguous-slug'])
  assert.deepEqual(JSON.parse(s.values.get(PREFERENCE_MIGRATION_DONE_KEY)!), ['old-slug', 'ambiguous-slug'])
  s.store.setLiked(code, false, 'project_actions')
  assert.equal(s.store.view(code).count, 8, 'pending credit must not optimistically alter the public count')
  await until(() => !s.store.view(code).pending)
})

test('more than 100 registered projects are hydrated in bounded batches', async () => {
  const s = setup()
  for (let index = 0; index < 105; index++) {
    const suffix = String(index % 100).padStart(2, '0')
    s.store.register(`${index < 100 ? 'ABCDEF' : 'GHIJKL'}${suffix}`)
  }
  s.store.setActive(true)
  await until(() => s.requests.filter(r => r.path.includes('?codes=')).length === 2)
  assert.deepEqual(s.requests.filter(r => r.path.includes('?codes=')).map(r => r.path.split('=')[1]!.split(',').length), [100, 5])
})
