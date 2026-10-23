import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { mediaRedirect } from '../src/config/media-redirect'

test('old media URLs redirect to stored WebP files without changing the protected endpoint', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'avgst-media-alias-'))
  const previous = process.env.CMS_MEDIA_DIR
  process.env.CMS_MEDIA_DIR = directory
  try {
    assert.equal(await mediaRedirect('https://cms.example/api/media/file/photo.jpg'), null)
    await writeFile(path.join(directory, 'webp-redirects.json'), JSON.stringify({ 'photo.jpg': 'photo.webp', 'unsafe.jpg': '../private.webp' }))
    const response = await mediaRedirect('https://cms.example/api/media/file/photo.jpg?download=true')
    assert.equal(response?.status, 308)
    assert.equal(response?.headers.get('location'), 'https://cms.example/api/media/file/photo.webp?download=true')
    assert.equal(await mediaRedirect('https://cms.example/api/media/file/unsafe.jpg'), null)
    assert.equal(await mediaRedirect('https://cms.example/api/media'), null)
  } finally {
    if (previous === undefined) delete process.env.CMS_MEDIA_DIR
    else process.env.CMS_MEDIA_DIR = previous
    assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep))
    await rm(directory, { recursive: true, force: true })
  }
})
