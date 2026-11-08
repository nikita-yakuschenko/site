import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { currentPassport } from '../../src/lib/passports/service'
import { atomicJSON, documentDirectory, lease, passportRoot, queuePassport, readJSON, type PassportJob, type PassportManifest } from '../../src/lib/passports/storage'

const once = process.argv.includes('--once')
const only = process.argv.find(value => value.startsWith('--slug='))?.slice(7)
const python = process.env.PASSPORT_PYTHON || 'python'
async function runRenderer(input: string, output: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(python, ['passports/render.py', input, output, '--site-root', process.cwd(), '--asset-origin', process.env.CMS_PUBLIC_URL || 'http://localhost:3001', '--asset-origin', 'https://cms.avgst.ru'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let detail = ''
    child.stdout.on('data', chunk => { detail = (detail + chunk).slice(-4000) })
    child.stderr.on('data', chunk => { detail = (detail + chunk).slice(-4000) })
    const timeout = setTimeout(() => child.kill(), 10 * 60_000)
    child.on('error', error => { clearTimeout(timeout); reject(error) })
    child.on('exit', code => { clearTimeout(timeout); if (code === 0) resolve(); else reject(new Error(`renderer-failed:${code}: ${detail.slice(-1600)}`)) })
  })
}
async function normaliseBuildReport(directory: string) {
  const file = path.join(directory, 'report.json')
  const report = await readJSON<{ pdf?: string; checks?: { page: number; png: string }[] }>(file)
  if (!report) return
  report.pdf = path.join(directory, 'passport.pdf')
  if (report.checks) report.checks = report.checks.map(check => ({ ...check, png: path.join(directory, 'pages', `page-${String(check.page).padStart(3, '0')}.png`) }))
  await atomicJSON(file, report)
}
async function published() {
  const origin = process.env.CMS_PUBLIC_URL || 'http://localhost:3001'
  const response = await fetch(`${origin}/api/projects/catalog`, { headers: { Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error('catalog-unavailable')
  const data = await response.json() as { items: { slug: string }[] }
  return data.items.filter(item => !only || item.slug === only)
}
export async function reconcile() {
  let queued = 0
  for (const item of await published()) for (const region of ['nn', 'msk'] as const) {
    try {
      const current = await currentPassport(item.slug, region)
      const manifest = await readJSON<PassportManifest>(path.join(documentDirectory(item.slug, region), 'latest.json'))
      if (manifest?.fingerprint !== current.fingerprint) { await queuePassport(item.slug, region, current.fingerprint); queued++ }
    } catch (error) { console.error(JSON.stringify({ event: 'passport.preflight-blocked', slug: item.slug, region, error: error instanceof Error ? error.message : 'invalid-data' })) }
  }
  return queued
}
export async function drain() {
  const jobs = path.join(passportRoot(), 'jobs')
  await fs.mkdir(jobs, { recursive: true })
  for (const name of (await fs.readdir(jobs)).filter(name => name.endsWith('.json')).sort()) {
    const file = path.join(jobs, name)
    const job = await readJSON<PassportJob>(file)
    if (!job || job.nextAttemptAt > Date.now() || (only && only !== job.slug)) continue
    const release = await lease(`${file}.lock`)
    if (!release) continue
    let temporary = ''
    try {
      const current = await currentPassport(job.slug, job.region)
      if (current.fingerprint !== job.fingerprint) { await queuePassport(job.slug, job.region, current.fingerprint); await fs.unlink(file); continue }
      const directory = documentDirectory(job.slug, job.region)
      const version = path.join(directory, job.fingerprint)
      const existingReport = await readJSON<{ status: string; pageCount: number }>(path.join(version, 'report.json'))
      if (existingReport?.status === 'passed' && existingReport.pageCount >= 3 + current.data.plans.length && (await fs.stat(path.join(version, 'passport.pdf')).catch(() => null))?.size) {
        const after = await currentPassport(job.slug, job.region)
        if (after.fingerprint === job.fingerprint) {
          await normaliseBuildReport(version)
      await atomicJSON(path.join(directory, 'latest.json'), { fingerprint: job.fingerprint, createdAt: new Date().toISOString(), filename: 'passport.pdf', pageCount: existingReport.pageCount } satisfies PassportManifest)
          await fs.unlink(file)
          console.log(JSON.stringify({ event: 'passport.reused', slug: job.slug, region: job.region }))
        } else { await queuePassport(job.slug, job.region, after.fingerprint); await fs.unlink(file) }
        continue
      }
      temporary = path.join(directory, `.building-${randomUUID()}`)
      await fs.mkdir(temporary, { recursive: true })
      await atomicJSON(file, { ...job, state: 'running' })
      const input = path.join(temporary, 'snapshot.json')
      await atomicJSON(input, current.data)
      await runRenderer(input, temporary)
      const pdf = path.join(temporary, 'passport.pdf')
      if ((await fs.stat(pdf)).size < 1000) throw new Error('invalid-render-output')
      const after = await currentPassport(job.slug, job.region)
      if (after.fingerprint !== job.fingerprint) { await queuePassport(job.slug, job.region, after.fingerprint); await fs.unlink(file); continue }
      for (let attempt = 0; ; attempt++) {
        try { await fs.rename(temporary, version); temporary = ''; break } catch (error) {
          if (['EEXIST', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code || '')) break
          if (attempt >= 6 || !['EPERM', 'EBUSY', 'EACCES'].includes((error as NodeJS.ErrnoException).code || '')) throw error
          await new Promise(resolve => setTimeout(resolve, 40 * 2 ** attempt))
        }
      }
      await normaliseBuildReport(version)
      const report = await readJSON<{ pageCount: number; status: string }>(path.join(version, 'report.json'))
      if (report?.status !== 'passed' || !Number.isInteger(report.pageCount)) throw new Error('invalid-render-report')
      await atomicJSON(path.join(directory, 'latest.json'), { fingerprint: job.fingerprint, createdAt: new Date().toISOString(), filename: 'passport.pdf', pageCount: report.pageCount } satisfies PassportManifest)
      await fs.unlink(file)
      console.log(JSON.stringify({ event: 'passport.ready', slug: job.slug, region: job.region, fingerprint: job.fingerprint }))
    } catch (error) {
      const attempts = job.attempts + 1
      const reason = error instanceof Error ? error.message : 'build-failed'
      await atomicJSON(file, { ...job, state: 'failed', attempts, nextAttemptAt: Date.now() + Math.min(30_000 * 2 ** attempts, 15 * 60_000), error: reason })
      console.error(JSON.stringify({ event: 'passport.failed', slug: job.slug, region: job.region, attempts, error: reason }))
    } finally {
      if (temporary) await fs.rm(temporary, { recursive: true, force: true })
      await release()
    }
  }
}
async function main() {
  const release = await lease(path.join(passportRoot(), 'worker.lock'))
  if (!release) throw new Error('passport-worker-already-running')
  try {
    let lastReconcile = 0
    do {
      const signals = path.join(passportRoot(), 'signals')
      await fs.mkdir(signals, { recursive: true })
      const changes = await fs.readdir(signals)
      if (changes.length || Date.now() - lastReconcile > 60_000) {
        // Consume before resolving; changes arriving during reconciliation remain queued.
        for (const name of changes) if (name.endsWith('.json')) await fs.unlink(path.join(signals, name)).catch(() => {})
        await reconcile(); lastReconcile = Date.now()
      }
      await drain()
      if (!once) await new Promise(resolve => setTimeout(resolve, 2000))
    } while (!once)
  } finally { await release() }
}
if (process.argv[1]?.endsWith('worker.ts')) main().catch(error => { console.error(error instanceof Error ? error.message : 'worker-failed'); process.exitCode = 1 })
