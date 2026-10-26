import assert from 'node:assert/strict'
import { test } from 'node:test'
import { preserveProjectState } from '../src/config/project-publication'
import { projectPublicationStatus } from '../src/config/project-publication-status'

test('saving outdated editorial versions preserves live counters and distinguishes unpublication', async () => {
  const row = { code: 'ORIGINAL', _status: 'published', unpublished_at: null, like_count: '4', share_count: '3', view_count: '120', like_voters: ['visitor'], share_voters: ['share'] }
  let queries = 0
  const db = { execute: async () => { queries++; return { rows: [row] } } }
  const req = { transactionID: Promise.resolve('tx'), payload: { db: { sessions: { tx: { db } }, drizzle: { execute: () => { throw new Error('Must use saving transaction') } } } } }
  const save = (data: Record<string, unknown>) => preserveProjectState({ operation: 'update', data, originalDoc: { id: 1, viewCount: 0 }, req } as never)
  const result = await save({ _status: 'draft', viewCount: 0, code: 'ignored' })
  assert.equal(result.code, 'ORIGINAL'); assert.equal(result.viewCount, 120); assert.equal(result.likeCount, 4); assert.equal(result.shareCount, 3)
  assert.deepEqual(result.likeVoters, ['visitor']); assert.ok(result.unpublishedAt)
  assert.equal(projectPublicationStatus(result), 'unpublished')
  const date = result.unpublishedAt
  Object.assign(row, { _status: 'draft', unpublished_at: date })
  assert.equal((await save({ _status: 'draft' })).unpublishedAt, date)
  assert.equal((await save({ _status: 'published' })).unpublishedAt, null)
  assert.equal(queries, 3)
  assert.equal(projectPublicationStatus({ _status: 'draft' }), 'draft')
})
