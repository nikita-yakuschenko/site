import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildIdentity } from '../build-identity.mjs'

test('content identity is stable without Git, ignores secrets/derived files, and changes with source or media', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'avgst-build-identity-'))
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()))
    assert.ok(path.basename(root).startsWith('avgst-build-identity-'))
    await rm(root, { recursive: true, force: true })
  })
  await mkdir(path.join(root, 'src'))
  await mkdir(path.join(root, 'public/generated'), { recursive: true })
  await writeFile(path.join(root, 'package.json'), '{"version":"1.2.3"}')
  await writeFile(path.join(root, 'src/page.tsx'), 'original')
  await writeFile(path.join(root, 'public/logo.svg'), '<svg/>')
  const first = await buildIdentity(root, {})
  assert.match(first.buildId, /^[a-f0-9]{64}$/)
  assert.equal(first.version, '1.2.3')
  assert.equal(first.commit, 'unknown')
  assert.equal(first.sourceDirty, null)
  await writeFile(path.join(root, '.env'), 'TOKEN=private')
  await writeFile(path.join(root, 'public/generated/image.webp'), 'derived')
  assert.equal((await buildIdentity(root, {})).buildId, first.buildId)
  assert.equal((await buildIdentity(root, { CMS_SITE_API_KEY: 'private-server-secret' })).buildId, first.buildId)
  assert.notEqual((await buildIdentity(root, { NEXT_PUBLIC_SITE_URL: 'https://example.test' })).buildId, first.buildId)
  await writeFile(path.join(root, 'src/page.tsx'), 'changed')
  const changed = await buildIdentity(root, {})
  assert.notEqual(changed.buildId, first.buildId)
  await writeFile(path.join(root, 'public/logo.svg'), '<svg>changed</svg>')
  assert.notEqual((await buildIdentity(root, {})).buildId, changed.buildId)
  const revision = 'a'.repeat(40)
  assert.equal((await buildIdentity(root, { APP_COMMIT: revision })).commit, revision)
  assert.equal((await buildIdentity(root, { APP_COMMIT: 'unknown', GITHUB_SHA: revision })).commit, revision)
  assert.equal((await buildIdentity(root, { APP_COMMIT: 'not-a-revision' })).commit, 'unknown')
})
