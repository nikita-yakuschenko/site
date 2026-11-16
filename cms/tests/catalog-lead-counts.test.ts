import test from 'node:test'
import assert from 'node:assert/strict'
import { countProjectLeads } from '../src/config/catalog-lead-counts'

const projects = [{ id: 1, code: 'PROJ08AB', slug: 'barnhouse-113', importKey: 'catalog:barnhouse-113' }]

test('a project lead is counted once even when several identifiers match', () => {
  const counts = countProjectLeads(projects, [{ status: 'sent', payload: { projectId: 'PROJ08AB', projectExternalId: 'barnhouse-113', meta: { projectSlug: 'barnhouse-113' } } }])
  assert.equal(counts.get(1), 1)
})

test('saved applications count even when CRM delivery failed', () => {
  const counts = countProjectLeads(projects, [
    { status: 'failed', payload: { projectId: 'PROJ08AB' } },
    { status: 'sent', payload: { name: 'Тест' } },
  ])
  assert.equal(counts.get(1), 1)
})

test('project page takes priority and attributes forms without a project identifier', () => {
  const counts = countProjectLeads([...projects, { id: 2, slug: 'another-project' }], [
    { payload: { sourcePath: '/catalog/barnhouse-113', projectExternalId: 'another-project' } },
    { payload: { sourceUrl: 'https://avgst.ru/catalog/barnhouse-113/?utm_source=yandex' } },
    { payload: { sourcePath: '/catalog' } },
  ])
  assert.deepEqual([...counts], [[1, 2]])
})
