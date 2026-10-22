import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { getPayload } from 'payload'
import { captureLikeBaseline, preferenceIdentity, setPreference, type PreferenceDatabase } from '../../src/optimization/likes'

const target = process.env.OPTIMIZATION_PAYLOAD_TEST_DATABASE_URL
test('real Payload create, edit and delete preserve the canonical projection', { skip: !target }, async () => {
  const url = new URL(target!)
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname))
  assert.match(url.pathname, /^\/ao_test_(?:payload|release)$/)
  Object.assign(process.env, { DATABASE_URL: target, PAYLOAD_SECRET: 'ao02-disposable-payload-integration-secret-32-chars', CMS_PUBLIC_URL: 'http://localhost:3001', CMS_SEED: '0', PAYLOAD_DB_PUSH: 'false', NEXT_PHASE: 'phase-production-build' })
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  let id: number | undefined
  try {
    const project = await payload.create({ collection: 'projects', overrideAccess: true, data: {
      name: 'AO02 synthetic edit test', slug: `ao02-edit-${randomUUID()}`, recordType: 'project',
      technologyBadge: 'Панельно-каркасный', areaValue: 80, floorsValue: 1, bedrooms: 2, bathrooms: 1, _status: 'published',
    } })
    id = project.id
    assert.ok(project.code)
    const db = (payload.db as unknown as { drizzle: PreferenceDatabase }).drizzle
    await captureLikeBaseline(db, project.code, 'synthetic-payload-test')
    const owner = preferenceIdentity(`c:${'a'.repeat(32)}`, 'ao02-disposable-subject-secret-for-tests')
    assert.equal((await setPreference(db, project.code, owner, { liked: true, operation_id: randomUUID(), expected_revision: 0, source: 'project_card' })).status, 200)
    const updated = await payload.update({ collection: 'projects', id, overrideAccess: true, data: { name: 'AO02 synthetic edited', likeCount: 999, likeVoters: [] } })
    assert.equal(updated.likeCount, 1)
    assert.deepEqual(updated.likeVoters, [])
  } finally {
    if (id) await payload.delete({ collection: 'projects', id, overrideAccess: true })
    await payload.destroy()
  }
})
