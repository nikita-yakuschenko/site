import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { prepareWebpAssets } from '../prepare-webp-assets.mjs'

test('stored assets are WebP, preserve alpha, reuse existing output and leave sources intact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'avgst-webp-test-'))
  try {
    await mkdir(path.join(root, 'public', 'images'), { recursive: true })
    await mkdir(path.join(root, 'src'), { recursive: true })
    await writeFile(path.join(root, 'src', 'example.tsx'), "import image from '../../public/generated/imports/images/photo.jpg.webp'")
    const jpeg = await sharp({ create: { width: 32, height: 16, channels: 3, background: '#eebb77' } }).jpeg().toBuffer()
    const png = await sharp({ create: { width: 16, height: 16, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0.5 } } }).png().toBuffer()
    await writeFile(path.join(root, 'public', 'images', 'photo.jpg'), jpeg)
    await writeFile(path.join(root, 'public', 'images', 'plan.png'), png)
    await writeFile(path.join(root, 'public', 'images', 'photo+detail.jpg'), jpeg)
    await writeFile(path.join(root, 'public', 'images', 'icon.svg'), '<svg/>')
    const manifest = await prepareWebpAssets(root)
    assert.equal(Object.keys(manifest).length, 3)
    assert.match(manifest['/images/photo+detail.jpg'], /photo%2Bdetail-/)
    const photo = path.join(root, 'public', manifest['/images/photo.jpg'])
    const plan = path.join(root, 'public', manifest['/images/plan.png'])
    assert.equal((await sharp(await readFile(photo)).metadata()).format, 'webp')
    assert.equal((await sharp(await readFile(path.join(root, 'public/generated/imports/images/photo.jpg.webp'))).metadata()).format, 'webp')
    assert.equal((await sharp(await readFile(plan)).metadata()).hasAlpha, true)
    assert.equal((await sharp(await readFile(plan)).metadata()).format, 'webp')
    assert.deepEqual(await readFile(path.join(root, 'public', 'images', 'photo.jpg')), jpeg)
    const modified = (await stat(photo)).mtimeMs
    assert.deepEqual(await prepareWebpAssets(root), manifest)
    assert.equal((await stat(photo)).mtimeMs, modified)
    execFileSync(process.execPath, [fileURLToPath(new URL('../package-public-assets.mjs', import.meta.url))], { cwd: root })
    await assert.rejects(stat(path.join(root, 'public-runtime', 'images', 'photo.jpg')), { code: 'ENOENT' })
    await assert.rejects(stat(path.join(root, 'public-runtime', 'generated', 'imports')), { code: 'ENOENT' })
    assert.equal((await sharp(await readFile(path.join(root, 'public-runtime', manifest['/images/photo.jpg']))).metadata()).format, 'webp')
    assert.equal(await readFile(path.join(root, 'public-runtime', 'images', 'icon.svg'), 'utf8'), '<svg/>')
    await writeFile(path.join(root, 'public', 'images', 'photo.jpg'), png)
    assert.notEqual((await prepareWebpAssets(root))['/images/photo.jpg'], manifest['/images/photo.jpg'])
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep))
    await rm(root, { recursive: true, force: true })
  }
})
