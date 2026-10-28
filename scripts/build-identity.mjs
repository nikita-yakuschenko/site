import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const roots = ['src', 'config', 'public', 'scripts']
const configFiles = ['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json', 'Dockerfile', 'docs/cookie-policy-final.md', 'docs/politika_obrabotki_personalnyh_dannyh_final.md']

export async function buildIdentity(root, environment = process.env) {
  const hash = createHash('sha256')
  async function scan(relative) {
    for (const entry of (await readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const file = relative + '/' + entry.name
      // Derived assets are represented by their source + content-hash manifest.
      if (file === 'public/generated') continue
      if (entry.isDirectory()) await scan(file)
      else if (entry.isFile()) await add(file)
    }
  }
  async function add(relative) {
    hash.update(relative).update('\0')
    const content = createHash('sha256')
    for await (const chunk of createReadStream(path.join(root, relative))) content.update(chunk)
    hash.update(content.digest()).update('\0')
  }
  for (const directory of roots) {
    try { await scan(directory) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  for (const file of configFiles) {
    try { await add(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  const candidate = [environment.APP_COMMIT, environment.GITHUB_SHA].find(value => /^[a-f0-9]{7,64}$/i.test(value || ''))
  let commit = candidate || 'unknown'
  let commitSource = candidate ? 'environment' : 'unavailable'
  let sourceDirty = null
  try {
    if (!candidate) {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim()
      commitSource = 'git'
    }
    sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', ...roots, ...configFiles], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim())
  } catch { /* Docker contexts may intentionally omit .git; the content build ID still identifies the artifact. */ }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
  const version = environment.APP_VERSION || pkg.version
  const publicEnvironment = Object.fromEntries(Object.entries(environment).filter(([name]) => name.startsWith('NEXT_PUBLIC_')).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
  hash.update(JSON.stringify({ version, commit, sourceDirty, publicEnvironment, node: process.version, platform: process.platform, arch: process.arch }))
  return { version, commit, commitSource, sourceDirty, buildId: hash.digest('hex') }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd()
  const identity = await buildIdentity(root)
  await mkdir(path.join(root, 'build'), { recursive: true })
  await writeFile(path.join(root, 'build', 'identity.json'), JSON.stringify(identity, null, 2) + '\n')
  console.log(`Build identity: ${identity.buildId}; commit: ${identity.commit}; source: ${identity.commitSource}`)
}
