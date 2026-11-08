import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fingerprint, lease, queuePassport, readJSON, passportRoot, documentDirectory } from '../src/lib/passports/storage'
import { passportToken } from '../src/lib/passports/access'
import { GET } from '../src/app/api/passports/[slug]/route'

test('canonical fingerprints ignore key order but detect plan changes', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }))
  const original = { plans: [{ floors: [{ rooms: [{ name: 'Кухня', area: '12' }] }] }] }
  assert.notEqual(fingerprint(original), fingerprint({ plans: [...original.plans, original.plans[0]] }))
  assert.notEqual(fingerprint(original), fingerprint({ plans: [{ floors: [{ rooms: [{ name: 'Кухня', area: '13' }] }] }] }))
})
test('identical jobs deduplicate and competing workers acquire one lease', async () => {
  const previous = process.env.PASSPORT_STORAGE_DIR
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'avgst-passport-test-'))
  process.env.PASSPORT_STORAGE_DIR = root
  try {
    await Promise.all(Array.from({ length: 8 }, () => queuePassport('test-house', 'nn', 'a'.repeat(64))))
    assert.equal((await fs.readdir(path.join(passportRoot(), 'jobs'))).length, 1)
    const locks = await Promise.all(Array.from({ length: 8 }, () => lease(path.join(root, 'job.lock'))))
    assert.equal(locks.filter(Boolean).length, 1)
    await locks.find(Boolean)!()
    const replacement = await lease(path.join(root, 'job.lock'))
    assert.ok(replacement); await replacement()
    assert.throws(() => documentDirectory('../outside', 'nn'))
    assert.throws(() => documentDirectory('test-house', 'bad-region'))
    assert.equal(await readJSON(path.join(root, 'nonexistent.json')), null)
  } finally { process.env.PASSPORT_STORAGE_DIR = previous; await fs.rm(root, { recursive: true, force: true }) }
})
test('expired worker leases recover instead of leaving a permanently stuck job', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'avgst-passport-test-'))
  try {
    const file = path.join(root, 'stale.lock'); await fs.mkdir(file)
    await fs.utimes(file, new Date(0), new Date(0))
    const release = await lease(file, 10)
    assert.ok(release); await release()
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})
test('download validates region and signed receipt before touching CMS or disk', async () => {
  const enabled = process.env.PASSPORT_ENABLED; const key = process.env.CMS_SITE_API_KEY
  process.env.PASSPORT_ENABLED = '1'; process.env.CMS_SITE_API_KEY = 'test-signing-key'
  const context = { params: Promise.resolve({ slug: 'test-house' }) }
  try {
    assert.equal((await GET(new Request('http://localhost/api/passports/test-house?region=bad'), context)).status, 400)
    assert.equal((await GET(new Request('http://localhost/api/passports/test-house?region=nn'), context)).status, 403)
    const expires = String(Date.now() - 1000); const token = passportToken('test-house', 'nn', '1', expires)
    const url = `http://localhost/api/passports/test-house?region=nn&receipt=1&expires=${expires}&token=${token}`
    assert.equal((await GET(new Request(url), context)).status, 403)
    process.env.PASSPORT_ENABLED = '0'
    assert.equal((await GET(new Request(url), context)).status, 404)
  } finally { process.env.PASSPORT_ENABLED = enabled; process.env.CMS_SITE_API_KEY = key }
})
