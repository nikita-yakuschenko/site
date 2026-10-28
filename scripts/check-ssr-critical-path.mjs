import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = path.resolve(process.argv[2] || process.cwd())
const output = path.resolve(process.argv[3] || 'docs/remediation/artifacts')
const source = path.resolve(import.meta.dirname, '..')
const require = createRequire(new URL('../package.json', import.meta.url))
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
function load(file) {
  const loaded = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(source, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === '../locale' ? load('src/lib/locale.ts') : require(name), loaded, loaded.exports)
  return loaded.exports
}
const items = load('src/lib/catalog/projects.ts').CATALOG_PROJECTS
const results = []
fs.mkdirSync(output, { recursive: true })
for (const [target, origin] of [['public', 'public'], ['.next/static', '.next/static']]) {
  const destination = path.join(root, '.next/standalone', target)
  if (!fs.existsSync(destination)) fs.symlinkSync(path.join(root, origin), destination, 'junction')
}
for (const delay of [0, 250]) for (let run = 1; run <= 5; run++) {
  const requests = []
  const mock = http.createServer(async (req, res) => {
    const record = { url: req.url, start: performance.now() }
    requests.push(record)
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
    await sleep(delay)
    let data = {}
    if (req.url.startsWith('/api/pages/redirects')) data = { rules: [] }
    else if (req.url.includes('/metrica')) data = { enabled: false, configured: true }
    else if (req.url.endsWith('/counter')) data = { configured: true, projectId: '' }
    else if (req.url.startsWith('/api/blocks/content')) data = { blocks: [], parts: [] }
    else if (req.url.startsWith('/api/projects/catalog')) {
      const slug = new URL(req.url, 'http://localhost').searchParams.get('slug')
      data = { items: slug ? items.filter(item => item.slug === slug) : items }
    } else if (req.url.startsWith('/api/stories/feed')) data = { items: [] }
    else { res.writeHead(404); res.end('{}'); record.end = performance.now(); return }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data)); record.end = performance.now()
  })
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve))
  const allocation = http.createServer()
  await new Promise(resolve => allocation.listen(0, '127.0.0.1', resolve))
  const port = allocation.address().port
  await new Promise(resolve => allocation.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['.next/standalone/server.js'], { cwd: root, env: { ...process.env, NODE_ENV: 'production', PORT: String(port), HOSTNAME: '127.0.0.1', CMS_PUBLIC_URL: `http://127.0.0.1:${mock.address().port}`, CMS_SITE_API_KEY: 'local-timing-test-only', BROWSER_DIAGNOSTICS_FIXTURE_CATALOG: '0', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore' })
  try {
    let ready = false
    for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch { /* Starting server. */ } await sleep(100) }
    if (!ready) throw new Error('Isolated server failed to start')
    for (const route of ['/privacy', '/catalog', '/catalog/barhhouse-73']) {
      requests.length = 0
      const start = performance.now(), response = await fetch(base + route), ttfbMs = performance.now() - start
      const body = await response.text(), totalMs = performance.now() - start
      const first = requests[0]?.start || start
      if (response.status !== 200) throw new Error(`Scenario ${route} returned ${response.status}`)
      const result = { delayMs: delay, run, route, status: response.status, ttfbMs, totalMs, htmlBytes: Buffer.byteLength(body), requests: requests.map(record => ({ ...record, start: record.start - first, end: record.end ? record.end - first : null })) }
      results.push(result); console.log(JSON.stringify({ ...result, requests: requests.map(record => record.url) }))
    }
  } finally {
    child.kill(); if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve))
    mock.closeAllConnections(); await new Promise(resolve => mock.close(resolve))
    fs.writeFileSync(path.join(output, 'step-02-ssr.json'), JSON.stringify(results, null, 2))
  }
}
