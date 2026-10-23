import { copyFile, mkdir, readFile, realpath, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { getPayload } from 'payload'
import sharp from 'sharp'

if (existsSync('.env')) process.loadEnvFile('.env')
// Inventory must not run startup seeders or modify unrelated content.
process.env.CMS_MAINTENANCE = '1'
const apply = process.argv.includes('--apply')
const backupArgument = process.argv.find(value => value.startsWith('--backup-dir='))?.slice('--backup-dir='.length)
if (apply && !backupArgument) throw new Error('For --apply provide --backup-dir=/absolute/private/backup/path')
const directory = await realpath(path.resolve(process.env.CMS_MEDIA_DIR || './media'))
const backup = backupArgument ? path.resolve(backupArgument) : null
if (backup && (!path.isAbsolute(backupArgument!) || backup === directory || backup.startsWith(directory + path.sep))) throw new Error('Backup directory must be absolute and outside public media storage')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const aliasesPath = path.join(directory, 'webp-redirects.json')
let aliases: Record<string, string> = {}
try { aliases = JSON.parse(await readFile(aliasesPath, 'utf8')) } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
try {
  let page = 1
  for (;;) {
    // Stable pagination includes already-converted records, so updates cannot shift the next page.
    const result = await payload.find({ collection: 'media', depth: 0, sort: 'id', page, limit: 100, overrideAccess: true })
    for (const doc of result.docs) {
      if (!doc.mimeType || !['image/jpeg', 'image/png', 'image/avif'].includes(doc.mimeType) || !doc.filename) continue
      console.log(JSON.stringify({ id: doc.id, filename: doc.filename, action: apply ? 'convert' : 'would-convert' }))
      if (!apply) continue
      const folder = path.join(backup!, String(doc.id))
      await mkdir(folder, { recursive: true, mode: 0o700 })
      await writeFile(path.join(folder, 'record.json'), JSON.stringify(doc, null, 2), { flag: 'wx' })
      const filenames = [doc.filename, ...Object.values(doc.sizes || {}).map(size => size?.filename).filter((name): name is string => Boolean(name))]
      for (const name of filenames) {
        const source = await realpath(path.join(directory, name))
        if (!source.startsWith(directory + path.sep) || path.basename(name) !== name) throw new Error('Media path is outside storage')
        await copyFile(source, path.join(folder, name))
      }
      const current = await payload.findByID({ collection: 'media', id: doc.id, depth: 0, overrideAccess: true })
      if (current.updatedAt !== doc.updatedAt) throw new Error(`Media ${doc.id} changed during inventory; retry after reviewing backup`)
      const updated = await payload.update({ collection: 'media', id: doc.id, data: { title: doc.title, alt: doc.alt, description: doc.description }, filePath: path.join(folder, doc.filename), overrideAccess: true })
      if (updated.mimeType !== 'image/webp' || !updated.filename?.endsWith('.webp')) throw new Error(`Media ${doc.id}: conversion did not produce WebP`)
      if ((await sharp(await readFile(path.join(directory, updated.filename))).metadata()).format !== 'webp') throw new Error('Stored file is not WebP')
      aliases[doc.filename] = updated.filename
      for (const [key, previous] of Object.entries(doc.sizes || {})) {
        const next = updated.sizes?.[key as keyof typeof updated.sizes]
        if (previous?.filename && next?.filename) aliases[previous.filename] = next.filename
      }
      await writeFile(aliasesPath + '.tmp', JSON.stringify(aliases, null, 2))
      await rename(aliasesPath + '.tmp', aliasesPath)
    }
    if (!result.hasNextPage) break
    page++
  }
} finally { await payload.destroy() }
