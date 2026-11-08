import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { resolvePassportData } from './resolver'
import { contentRevision, documentDirectory, fingerprint, queuePassport, readJSON, type PassportManifest } from './storage'

export async function currentPassport(slug: string, region: 'nn' | 'msk') {
  const data = await resolvePassportData(slug, region)
  // Presentation date is not a dependency; otherwise every day rebuilds the catalogue.
  const stable = { ...data, contacts: { ...data.contacts, updatedAt: '' } }
  const urls = [...new Set([data.project.heroImage, ...data.plans.flatMap(variant => variant.floors.map(floor => floor.image))])]
  const allowed = new Set([new URL(process.env.CMS_PUBLIC_URL || 'http://localhost:3001').origin, 'https://cms.avgst.ru'])
  const assetVersions = await Promise.all(urls.map(async source => {
    const url = new URL(source)
    if (!allowed.has(url.origin) || url.username || url.password) throw new Error('passport-asset-origin-not-allowed')
    const body = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!body.ok || Number(body.headers.get('content-length')) > 24 * 1024 * 1024) throw new Error('passport-asset-unavailable')
    const chunks: Uint8Array[] = []; let bytes = 0
    if (!body.body) throw new Error('passport-asset-empty')
    const reader = body.body.getReader()
    try { while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 24 * 1024 * 1024) throw new Error('passport-asset-too-large'); chunks.push(value) } } finally { await reader.cancel() }
    return { source, hash: createHash('sha256').update(Buffer.concat(chunks)).digest('hex') }
  }))
  const revision = await contentRevision()
  const digest = fingerprint({ data: stable, revision, assetVersions })
  return { data, fingerprint: digest }
}
export async function readyPassport(slug: string, region: 'nn' | 'msk') {
  const current = await currentPassport(slug, region)
  const directory = documentDirectory(slug, region)
  const manifest = await readJSON<PassportManifest>(path.join(directory, 'latest.json'))
  if (!manifest || manifest.fingerprint !== current.fingerprint) {
    await queuePassport(slug, region, current.fingerprint)
    return { ready: false as const, fingerprint: current.fingerprint }
  }
  const file = path.join(directory, current.fingerprint, 'passport.pdf')
  try { await fs.access(file) } catch { await queuePassport(slug, region, current.fingerprint); return { ready: false as const, fingerprint: current.fingerprint } }
  return { ready: true as const, file, manifest, fingerprint: current.fingerprint, filename: `AVGST_${slug}_${region.toUpperCase()}.pdf` }
}
