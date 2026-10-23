import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export async function prepareWebpAssets(root = process.cwd()) {
  const directory = path.join(root, 'public')
  const generated = path.join(directory, 'generated', 'webp')
  const manifest = {}
  await mkdir(generated, { recursive: true })
  let before = 0, after = 0
  const imported = new Set()
  async function scanImports(folder) {
    let entries
    try { entries = await readdir(folder, { withFileTypes: true }) } catch (error) {
      if (error.code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const file = path.join(folder, entry.name)
      if (entry.isDirectory()) await scanImports(file)
      else if (/\.tsx?$/.test(entry.name)) {
        const source = await readFile(file, 'utf8')
        for (const match of source.matchAll(/['"](?:\.\.\/)+public\/generated\/imports\/([^'"]+\.(?:jpe?g|png|avif))\.webp['"]/gi)) imported.add(match[1])
      }
    }
  }
  await scanImports(path.join(root, 'src'))
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Video frame sequences already have their own verified lossless WebP build.
        if (folder === directory && ['generated', 'video'].includes(entry.name)) continue
        await visit(path.join(folder, entry.name))
        continue
      }
      if (!entry.isFile() || !/\.(jpe?g|png|avif)$/i.test(entry.name)) continue
      const source = path.join(folder, entry.name)
      const original = await readFile(source)
      const digest = createHash('sha256').update('webp-v1-quality85-max2560-png-lossless').update(original).digest('hex').slice(0, 16)
      const relative = path.relative(directory, source).split(path.sep).join('/')
      const output = `${relative.replace(/\.[^.]+$/, '')}-${digest}.webp`
      const destination = path.join(generated, output)
      await mkdir(path.dirname(destination), { recursive: true })
      let encoded
      try { encoded = await readFile(destination) } catch (error) {
        if (error.code !== 'ENOENT') throw error
        const png = /\.png$/i.test(entry.name)
        let image = sharp(original, { animated: true }).rotate()
        if (!png) image = image.resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        encoded = await image.webp({ quality: 85, lossless: png, effort: 4 }).toBuffer()
        const temporary = `${destination}.tmp`
        await writeFile(temporary, encoded)
        await rename(temporary, destination)
      }
      manifest[`/${relative}`] = `/generated/webp/${output.split('/').map(encodeURIComponent).join('/')}`
      if (imported.has(relative)) {
        const alias = path.join(directory, 'generated', 'imports', relative + '.webp')
        await mkdir(path.dirname(alias), { recursive: true })
        await writeFile(alias, encoded)
      }
      before += original.length; after += encoded.length
    }
  }
  await visit(directory)
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, 'en')))
  await mkdir(path.join(root, 'src', 'data'), { recursive: true })
  await writeFile(path.join(root, 'src', 'data', 'webp-assets.json'), JSON.stringify(sorted, null, 2) + '\n')
  console.log(`Stored WebP assets: ${Object.keys(manifest).length}; ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`)
  return sorted
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareWebpAssets()
