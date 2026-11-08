import { createHash, randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const passportRoot = () => path.resolve(process.env.PASSPORT_STORAGE_DIR || '.local/passports')
export const validSlug = (slug: string) => slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
export const validRegion = (value: string): value is 'nn' | 'msk' => value === 'nn' || value === 'msk'
export function documentDirectory(slug: string, region: string) {
  if (!validSlug(slug) || !validRegion(region)) throw new Error('invalid-passport-key')
  return path.join(passportRoot(), 'documents', slug, region)
}
export async function atomicJSON(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 })
  try {
    for (let attempt = 0; ; attempt++) {
      try { await fs.rename(temporary, file); break } catch (error) {
        if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code || '')) throw error
        await new Promise(resolve => setTimeout(resolve, 20 * 2 ** attempt))
      }
    }
  } finally { await fs.unlink(temporary).catch(() => {}) }
}
export async function readJSON<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}
export function fingerprint(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex') }
export async function contentRevision(root = process.cwd()) {
  const hash = createHash('sha256')
  async function add(relative: string) {
    const absolute = path.join(root, relative)
    const stat = await fs.stat(absolute)
    if (stat.isDirectory()) {
      for (const child of (await fs.readdir(absolute)).sort()) if (!child.startsWith('.') && !['__pycache__', '.venv', 'output'].includes(child)) await add(path.join(relative, child))
    } else if (/\.(ts|js|py|css|html|svg|txt|woff2?)$/.test(relative)) hash.update(relative.replaceAll('\\', '/')).update(await fs.readFile(absolute))
  }
  for (const item of ['passports', 'src/lib/passports', 'src/lib/mortgage', 'src/lib/catalog/configuration-content.ts', 'src/lib/catalog/project-configurations-data.ts', 'src/lib/catalog/configuration-rules.ts', 'src/lib/catalog/tiers.ts', 'src/lib/catalog/frame-tiers.ts', 'src/components/configuration-comparison/model', 'src/lib/site.ts', 'src/lib/copy.ts', 'src/app/styles.css', 'public/logo.svg', 'public/logo_lg.svg', 'node_modules/geist/dist/fonts/geist-sans']) await add(item)
  return hash.digest('hex')
}
export type PassportManifest = { fingerprint: string; createdAt: string; filename: string; pageCount: number }
export type PassportJob = { slug: string; region: 'nn' | 'msk'; fingerprint: string; attempts: number; nextAttemptAt: number; queuedAt: string; state: 'queued' | 'running' | 'failed'; error?: string }
export async function queuePassport(slug: string, region: 'nn' | 'msk', digest: string) {
  documentDirectory(slug, region)
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('invalid-passport-fingerprint')
  const file = path.join(passportRoot(), 'jobs', `${slug}.${region}.${digest}.json`)
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  await fs.writeFile(temporary, JSON.stringify({ slug, region, fingerprint: digest, attempts: 0, nextAttemptAt: 0, queuedAt: new Date().toISOString(), state: 'queued' } satisfies PassportJob), { mode: 0o600, flag: 'wx' })
  try { await fs.link(temporary, file) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error } finally { await fs.unlink(temporary) }
  return file
}
export async function lease(file: string, maxAge = 15 * 60_000) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  try { await fs.mkdir(file) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const stat = await fs.stat(file)
    if (Date.now() - stat.mtimeMs <= maxAge) return null
    const expired = `${file}.expired-${randomUUID()}`
    try { await fs.rename(file, expired); await fs.rm(expired, { recursive: true, force: true }); await fs.mkdir(file) } catch { return null }
  }
  await fs.writeFile(path.join(file, 'owner.json'), JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }))
  const heartbeat = setInterval(() => { const now = new Date(); void fs.utimes(file, now, now).catch(() => {}) }, 10_000);
  heartbeat.unref();
  return async () => { clearInterval(heartbeat); await fs.rm(file, { recursive: true, force: true }) }
}
