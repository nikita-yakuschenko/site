import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PayloadRequest } from 'payload'
import type { User } from '../src/payload-types'
import { authenticated, contentManager, contentWriter, ownAccountOrSuper, superAdmin } from '../src/access/staff'
import { readEnvironment } from '../src/config/environment'
import { validateFirstAdmin } from '../src/access/bootstrap'
import { Users } from '../src/collections/Users'
import { clearPublicMediaCache, createMedia } from '../src/collections/Media'
import { GET } from '../src/app/api/health/route'

function request(role: User['role'], blocked = false, signedRole: User['role'] = role): PayloadRequest {
  return {
    user: { collection: 'users', id: 42, role: signedRole },
    context: {},
    payload: { findByID: async () => ({ id: 42, role, isBlocked: blocked }) },
  } as unknown as PayloadRequest
}

test('anonymous users cannot read staff or write content', async () => {
  const req = { user: null } as PayloadRequest
  for (const access of [authenticated, superAdmin, ownAccountOrSuper, contentWriter, contentManager]) {
    assert.equal(await access({ req }), false)
  }
})

test('server permissions distinguish all four roles', async () => {
  for (const role of ['super-admin', 'admin', 'editor', 'viewer'] as const) {
    const req = request(role)
    assert.equal(await authenticated({ req }), true)
    assert.equal(await superAdmin({ req }), role === 'super-admin')
    assert.equal(await contentWriter({ req }), role !== 'viewer')
    assert.equal(await contentManager({ req }), ['super-admin', 'admin'].includes(role))
    assert.deepEqual(await ownAccountOrSuper({ req }), role === 'super-admin' ? true : { id: { equals: 42 } })
  }
})

test('blocking and demotion override claims from previously issued JWT', async () => {
  const blocked = request('super-admin', true)
  for (const access of [authenticated, superAdmin, ownAccountOrSuper, contentWriter, contentManager]) {
    assert.equal(await access({ req: blocked }), false)
  }
  assert.equal(await superAdmin({ req: request('viewer', false, 'super-admin') }), false)
  assert.equal(await contentWriter({ req: request('viewer', false, 'editor') }), false)
})

test('local overrideAccess does not bypass anonymous first-user hook', async () => {
  const hook = Users.hooks!.beforeChange![0]
  await assert.rejects(() => hook({ operation: 'create', data: {}, req: { user: null, context: {} } } as Parameters<typeof hook>[0]))
})

test('own-account update cannot raise privileges or edit another account', async () => {
  const hook = Users.hooks!.beforeChange![0]
  const req = request('editor')
  const originalDoc = { id: 42, role: 'editor', isBlocked: false }
  for (const data of [{ role: 'super-admin' }, { isBlocked: true }]) {
    await assert.rejects(() => hook({ operation: 'update', data, originalDoc, req } as unknown as Parameters<typeof hook>[0]))
  }
  await assert.rejects(() => hook({ operation: 'update', data: {}, originalDoc: { ...originalDoc, id: 43 }, req } as Parameters<typeof hook>[0]))
  const data = { firstName: 'Новое имя' }
  assert.deepEqual(await hook({ operation: 'update', data, originalDoc, req } as unknown as Parameters<typeof hook>[0]), data)
})

test('blocking revokes existing sessions; blocked accounts cannot log in', async () => {
  const change = Users.hooks!.beforeChange![0]
  const result = await change({ operation: 'update', data: { isBlocked: true, sessions: [{ id: 'old' }] }, originalDoc: { id: 43 }, req: request('super-admin') } as unknown as Parameters<typeof change>[0])
  assert.deepEqual(result.sessions, [])
  const login = Users.hooks!.beforeLogin![0]
  assert.throws(() => login({ user: { isBlocked: true }, req: { t: () => 'Ошибка авторизации' } } as unknown as Parameters<typeof login>[0]))
})

test('production configuration fails closed and media writes require persistent storage', async () => {
  const valid: NodeJS.ProcessEnv = { DATABASE_URL: 'postgresql://localhost/cms', PAYLOAD_SECRET: 'x'.repeat(48), CMS_PUBLIC_URL: 'https://cms.avgst.ru', NODE_ENV: 'production' }
  for (const change of [{ PAYLOAD_SECRET: '' }, { DATABASE_URL: '' }, { CMS_PUBLIC_URL: 'http://cms.avgst.ru' }, { CMS_PUBLIC_URL: 'https://cms.avgst.ru/path' }]) {
    assert.throws(() => readEnvironment({ ...valid, ...change }))
  }
  assert.equal(readEnvironment(valid).uploadsEnabled, false)
  assert.equal(readEnvironment({ ...valid, CMS_MEDIA_PERSISTENT: 'true' }).uploadsEnabled, false)
  assert.equal(readEnvironment({ ...valid, CMS_MEDIA_PERSISTENT: 'true', CMS_MEDIA_DIR: '/app/media' }).uploadsEnabled, true)
  const media = createMedia({ directory: '/app/media', uploadsEnabled: false })
  for (const access of [media.access!.create!, media.access!.update!, media.access!.delete!]) {
    assert.equal(await access({ req: request('super-admin') }), false)
  }
})

test('bootstrap requires explicit identity and a strong password', () => {
  assert.throws(() => validateFirstAdmin({ email: 'invalid', password: '', firstName: '', lastName: '' }))
  assert.throws(() => validateFirstAdmin({ email: 'staff@example.test', password: 'short', firstName: 'Имя', lastName: 'Фамилия' }))
})

test('health is a minimal DB-independent liveness response', async () => {
  const response = GET()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(await response.json(), { status: 'ok', revision: process.env.CMS_REVISION ?? 'unknown' })
})

test('anonymous media access is limited to images referenced by connected public blocks', async () => {
  const media = createMedia({ directory: './media', uploadsEnabled: true })
  const req = {
    user: null,
    payload: { find: async (query: { collection: string; where: unknown; select: unknown; depth: number }) => {
      if (query.collection === 'blocks') return { docs: [] }
      assert.equal(query.collection, 'projects')
      assert.deepEqual(query.where, { or: [{ heroContentSource: { equals: 'database' } }, { exteriorsContentSource: { equals: 'database' } }, { interiorsContentSource: { equals: 'database' } }, { builtContentSource: { equals: 'database' } }, { plansContentSource: { equals: 'database' } }] })
      assert.deepEqual(query.select, { heroContentSource: true, exteriorsContentSource: true, interiorsContentSource: true, builtContentSource: true, plansContentSource: true, plans: true, desktopImage: true, mobileImage: true, exteriors: true, interiors: true, built: true })
      assert.equal(query.depth, 0)
      return { docs: [{ heroContentSource: 'database', desktopImage: 5, mobileImage: 9 }, { heroContentSource: 'mock', desktopImage: 99, exteriorsContentSource: 'database', exteriors: [{ photo: 12 }] }, { interiorsContentSource: 'database', interiors: [{ photo: 14 }], exteriors: [{ photo: 98 }] }, { builtContentSource: 'database', built: [{ type: 'photo', photo: 16 }, { type: 'video', photo: 17 }] }, { builtContentSource: 'mock', built: [{ photo: 97 }] }, { plansContentSource: 'database', plans: [{ floors: [{ photo: 21 }, { photo: 22 }] }] }, { plansContentSource: 'mock', plans: [{ floors: [{ photo: 96 }] }] }]  }
    } },
  } as unknown as PayloadRequest
  clearPublicMediaCache()
  assert.deepEqual(await media.access!.read!({ req }), { id: { in: [5, 9, 12, 14, 16, 17, 21, 22] } })
  req.payload.find = (async () => ({ docs: [] })) as unknown as typeof req.payload.find
  assert.deepEqual(await media.access!.read!({ req }), { id: { in: [5, 9, 12, 14, 16, 17, 21, 22] } })
  clearPublicMediaCache()
  assert.equal(await media.access!.read!({ req }), false)
})
