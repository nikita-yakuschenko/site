import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { getPayload } from 'payload'
import { createFirstAdmin } from '../../src/access/bootstrap'

// Run only against an explicitly designated EMPTY disposable PostgreSQL database
// and a CMS server using that same database. No schema drops or automatic reset.
const enabled = process.env.CMS_TEST_DATABASE === 'true' && Boolean(process.env.CMS_TEST_URL)

test('PostgreSQL, bootstrap, REST authorization, roles, blocking and health', { skip: !enabled }, async () => {
  const base = new URL(process.env.CMS_TEST_URL!)
  assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Integration server must be local')
  const password = randomBytes(32).toString('hex')
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  const call = async (path: string, method = 'GET', body?: object, token?: string) => {
    return fetch(new URL(path, base), {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  }
  const credentials = (email: string) => ({ email, password, firstName: 'Тест', lastName: 'CMS' })
  const login = async (email: string) => {
    const response = await call('/api/users/login', 'POST', { email, password })
    assert.equal(response.status, 200)
    const result = await response.json()
    const cookie = response.headers.get('set-cookie') || ''
    assert.match(cookie, /HttpOnly/i)
    assert.match(cookie, /Secure/i)
    assert.match(cookie, /SameSite=Strict/i)
    for (const key of ['hash', 'salt', 'password', 'resetPasswordToken']) assert.equal(result.user[key], undefined)
    return result.token as string
  }
  try {
    assert.equal((await payload.count({ collection: 'users' })).totalDocs, 0, 'Use an empty disposable DB')
    assert.equal((await call('/api/users/first-register', 'POST', credentials('first@example.test'))).status, 403)
    assert.ok([401, 403].includes((await call('/api/users', 'POST', credentials('anon@example.test'))).status))
    assert.equal((await call('/api/health')).status, 200)
    assert.ok([401, 403].includes((await call('/api/media')).status))
    await createFirstAdmin(payload, credentials('super@example.test'))
    await assert.rejects(() => createFirstAdmin(payload, credentials('second@example.test')))
    const superToken = await login('super@example.test')
    assert.equal((await call('/api/users/forgot-password', 'POST', { email: 'super@example.test' })).status, 403)
    for (const role of ['admin', 'editor', 'viewer'] as const) {
      const email = `${role}@example.test`
      const create = await call('/api/users', 'POST', { ...credentials(email), role }, superToken)
      assert.equal(create.status, 201)
      const { doc: user } = await create.json()
      const token = await login(email)
      assert.ok([401, 403].includes((await call('/api/users', 'POST', credentials(`new-${email}`), token)).status))
      const own = await call(`/api/users/${user.id}`, 'PATCH', { role: 'super-admin' }, token)
      assert.ok([200, 401, 403].includes(own.status))
      const record = await payload.findByID({ collection: 'users', id: user.id })
      assert.equal(record.role, role)
      assert.equal((await call('/api/media', 'GET', undefined, token)).status, 200)
      const other = await call(`/api/users/1`, 'PATCH', { firstName: 'Запрещено' }, token)
      assert.ok([401, 403, 404].includes(other.status))
      assert.equal((await call(`/api/users/${user.id}`, 'PATCH', { isBlocked: true }, superToken)).status, 200)
      assert.ok([401, 403].includes((await call('/api/media', 'GET', undefined, token)).status))
      assert.ok([401, 403].includes((await call('/api/users/login', 'POST', { email, password })).status))
      const me = await call('/api/users/me', 'GET', undefined, token)
      if (me.ok) assert.equal((await me.json()).user, null)
      else assert.ok([401, 403].includes(me.status))
    }
    const lockedEmail = 'lock-test@example.test'
    assert.equal((await call('/api/users', 'POST', { ...credentials(lockedEmail), role: 'viewer' }, superToken)).status, 201)
    await login(lockedEmail)
    for (let attempt = 0; attempt < 5; attempt++) {
      assert.equal((await call('/api/users/login', 'POST', { email: lockedEmail, password: `${password}-incorrect` })).ok, false)
    }
    assert.equal((await call('/api/users/login', 'POST', { email: lockedEmail, password })).ok, false, 'Five failed attempts must lock the account')
  } finally {
    await payload.destroy()
  }
})
