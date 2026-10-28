import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { chromium } from 'playwright'

const workspace = path.resolve(process.argv[2] || process.cwd())
const output = path.resolve(process.argv[3] || 'docs/remediation/artifacts')
const require = createRequire(new URL('../package.json', import.meta.url))
const sourceRoot = path.resolve(import.meta.dirname, '..')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const results = []
fs.mkdirSync(output, { recursive: true })

function loadFixture(file) {
  const loaded = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', js)(name => name === '../locale' ? loadFixture('src/lib/locale.ts') : require(name), loaded, loaded.exports)
  return loaded.exports
}
const projects = loadFixture('src/lib/catalog/projects.ts').CATALOG_PROJECTS
const identity = JSON.parse(fs.readFileSync(path.join(workspace, 'build/identity.json'), 'utf8'))
assert(fs.readFileSync(path.join(workspace, '.next/BUILD_ID'), 'utf8').trim() === identity.buildId, 'Next BUILD_ID differs from build identity')
for (const [target, source] of [['public', 'public'], ['.next/static', '.next/static']]) {
  const destination = path.join(workspace, '.next/standalone', target)
  if (!fs.existsSync(destination)) fs.symlinkSync(path.join(workspace, source), destination, 'junction')
}

async function check(name, action) {
  const started = performance.now()
  try { results.push({ name, status: 'PASSED', details: await action(), elapsedMs: performance.now() - started }) }
  catch (error) { results.push({ name, status: 'FAILED', error: error.message }); throw error }
  finally { fs.writeFileSync(path.join(output, 'step-01-runtime.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results.at(-1))) }
}

async function scenario(initialMode, action) {
  let mode = initialMode
  let catalogCalls = 0, mutations = 0
  const mock = http.createServer(async (req, res) => {
    if (req.method !== 'GET') { mutations++; res.writeHead(405); res.end(); return }
    res.setHeader('Content-Type', 'application/json')
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/api/projects/catalog') {
      catalogCalls++
      if (mode === 'timeout') return
      if (mode === 'unavailable') { await sleep(30); res.writeHead(503); res.end('{"error":"private-upstream-detail"}'); return }
      if (mode === 'malformed') { res.end('private-invalid-body'); return }
      if (mode === 'invalid-shape') { res.end('{"items":[null]}'); return }
      const slug = url.searchParams.get('slug')
      res.end(JSON.stringify({ items: slug ? projects.filter(item => item.slug === slug) : projects }))
    } else if (url.pathname.endsWith('/metrica')) res.end('{"enabled":false,"configured":true}')
    else if (url.pathname.endsWith('/counter')) res.end('{"configured":true,"projectId":""}')
    else if (url.pathname === '/api/blocks/content') res.end('{"blocks":[],"parts":[]}')
    else if (url.pathname === '/api/pages/redirects') res.end('{"rules":[]}')
    else if (url.pathname === '/api/stories/feed') res.end('{"items":[]}')
    else if (/\/api\/projects\/(exteriors|interiors)$/.test(url.pathname)) {
      const project = projects.find(item => item.slug === url.searchParams.get('slug'))
      res.end(JSON.stringify({ images: project?.[url.pathname.endsWith('/exteriors') ? 'exteriors' : 'interiors'] || [] }))
    } else { res.writeHead(404); res.end('{}') }
  })
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve))
  const allocation = http.createServer()
  await new Promise(resolve => allocation.listen(0, '127.0.0.1', resolve))
  const port = allocation.address().port
  await new Promise(resolve => allocation.close(resolve))
  const base = `http://127.0.0.1:${port}`
  const logFile = fs.createWriteStream(path.join(output, `step-01-server-${initialMode}.log`))
  const child = spawn(process.execPath, ['.next/standalone/server.js'], { cwd: workspace, env: { ...process.env,
    NODE_ENV: 'production', PORT: String(port), HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1',
    CMS_PUBLIC_URL: `http://127.0.0.1:${mock.address().port}`, CMS_SITE_API_KEY: initialMode === 'not-configured' ? '' : 'private-test-key',
    BROWSER_DIAGNOSTICS_FIXTURE_CATALOG: '0', CMS_REQUEST_LOGS: 'all',
  }, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(logFile, { end: false }); child.stderr.pipe(logFile, { end: false })
  try {
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Isolated frontend exited before readiness')
      try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch { /* Starting server. */ }
      await sleep(100)
    }
    assert(ready, 'Local server failed to start')
    await action({ base, setMode: value => { mode = value }, catalogCalls: () => catalogCalls })
    assert(mutations === 0, 'The mock received an unexpected mutation')
  } finally {
    child.kill()
    if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve))
    await new Promise(resolve => logFile.end(resolve))
    mock.closeAllConnections()
    await new Promise(resolve => mock.close(resolve))
  }
  const log = fs.readFileSync(path.join(output, `step-01-server-${initialMode}.log`), 'utf8')
  assert(!/private-test-key|private-upstream-detail|private-invalid-body/.test(log), 'Sensitive upstream material reached server logs')
}

const browser = await chromium.launch({ headless: true })
async function openPage(base, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile, extraHTTPHeaders: { 'x-avgst-request-id': 'spoofed-request-id' } })
  await context.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === base ? route.continue() : route.abort())
  const page = await context.newPage(); page.setDefaultTimeout(10000)
  return { context, page }
}

try {
  await scenario('healthy', async ({ base }) => {
    await check('build identity and independent health/readiness', async () => {
      const health = await fetch(base + '/api/health'), data = await health.json(), ready = await fetch(base + '/api/ready')
      assert(health.status === 200 && data.status === 'ok', 'Health is not live')
      assert(data.buildId === identity.buildId && data.commit === identity.commit, 'Health identifies another build')
      assert(ready.status === 200 && (await ready.json()).status === 'ready', 'Healthy CMS is not ready')
      return { buildId: data.buildId, commit: data.commit, health: health.status, readiness: ready.status }
    })
    const { context, page } = await openPage(base)
    await check('healthy catalog and genuine missing slug', async () => {
      const catalog = await page.goto(base + '/catalog', { waitUntil: 'domcontentloaded' })
      await page.locator('.card').first().waitFor()
      assert(catalog.status() === 200, 'Healthy catalog status is not 200')
      const id = catalog.headers()['x-request-id']
      assert(/^[a-f0-9-]{36}$/i.test(id || '') && id !== 'spoofed-request-id', 'Proxy did not replace a client request ID')
      const missing = await page.goto(base + '/catalog/no-such-project', { waitUntil: 'domcontentloaded' })
      assert(missing.status() === 404, 'A genuinely missing project is not 404')
      await page.getByRole('heading', { name: /Страница.*не найдена/ }).waitFor()
      return { catalog: 200, missing: 404, requestId: id }
    })
    await context.close()
    for (const mobile of [false, true]) {
      const session = await openPage(base, mobile)
      const page = session.page
      await check(`five client card transitions preserve region/favorite/Back (${mobile ? 'mobile' : 'desktop'})`, async () => {
        await page.goto(base + '/catalog', { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('html[data-app-hydrated=true]')
        await page.locator('.site-region__trigger').click()
        await page.getByRole('option', { name: /Московская область/ }).click()
        const card = page.locator('.card').filter({ has: page.locator('.card__media[href="/catalog/barhhouse-73"]') })
        await card.locator('.icon-btn[aria-pressed]').click()
        const navigations = []
        for (let run = 1; run <= 5; run++) {
          const before = await page.evaluate(() => performance.timeOrigin)
          await card.locator('.card__media').click()
          await page.waitForURL('**/catalog/barhhouse-73')
          await page.locator('.project-hero h1').waitFor()
          const after = await page.evaluate(() => performance.timeOrigin)
          assert(before === after, 'Project click reloaded the document')
          assert((await page.locator('.site-region__label').textContent()).includes('Московская область'), 'Client navigation reset the region')
          navigations.push({ run, sameDocument: true })
          await page.goBack({ waitUntil: 'domcontentloaded' })
          await page.waitForURL('**/catalog')
          await card.waitFor()
          assert(await card.locator('.icon-btn[aria-pressed]').getAttribute('aria-pressed') === 'true', 'Back lost the favorite')
        }
        return { navigations, region: 'msk', favoritePreserved: true }
      })
      await session.context.close()
    }
  })

  await scenario('unavailable', async ({ base, setMode }) => {
    const { context, page } = await openPage(base)
    for (let run = 1; run <= 5; run++) await check(`CMS503 catalog failure ${run}`, async () => {
      const response = await page.goto(base + '/catalog', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Не удалось загрузить страницу' }).waitFor()
      assert(response.status() !== 404, 'CMS failure became 404')
      const health = await fetch(base + '/api/health'), ready = await fetch(base + '/api/ready'), availability = await fetch(base + '/api/catalog/availability')
      assert(health.status === 200 && ready.status === 503 && availability.status === 503, 'Liveness/readiness/availability contract failed')
      return { html: response.status(), health: health.status, readiness: ready.status, availability: availability.status }
    })
    await check('CMS503 existing project is unavailable rather than missing', async () => {
      const response = await page.goto(base + '/catalog/barhhouse-73', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Не удалось загрузить страницу' }).waitFor()
      assert(response.status() !== 404, 'Existing project was a false 404')
      return { html: response.status() }
    })
    await check('retry recovers the existing project after an upstream 503', async () => {
      setMode('healthy')
      await page.getByRole('button', { name: 'Попробовать снова' }).click()
      await page.locator('.project-hero h1').waitFor()
      await sleep(2100)
      assert((await fetch(base + '/api/ready')).status === 200, 'Readiness did not recover')
      return { project: await page.locator('.project-hero h1').textContent(), readiness: 200 }
    })
    setMode('unavailable')
    await check('informational privacy page survives a catalog outage', async () => {
      const response = await page.goto(base + '/privacy', { waitUntil: 'domcontentloaded' })
      assert(response.status() === 200, 'An informational page failed with the catalog')
      assert(!await page.getByRole('heading', { name: 'Не удалось загрузить страницу' }).isVisible(), 'The shell outage escaped into the informational page')
      return { status: response.status() }
    })
    await context.close()
  })

  for (const mode of ['malformed', 'invalid-shape', 'not-configured']) await scenario(mode, async ({ base }) => {
    const { context, page } = await openPage(base)
    await check(`${mode} uses the error state, not an empty catalog or false 404`, async () => {
      const response = await page.goto(base + '/catalog/barhhouse-73', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Не удалось загрузить страницу' }).waitFor()
      assert(response.status() !== 404, 'Invalid upstream data became 404')
      assert((await fetch(base + '/api/ready')).status === 503, 'Invalid data was considered ready')
      return { html: response.status(), readiness: 503 }
    })
    await context.close()
  })

  await scenario('timeout', async ({ base, catalogCalls }) => {
    await check('five simultaneous readiness probes coalesce and time out without killing liveness', async () => {
      const started = performance.now(), responses = await Promise.all(Array.from({ length: 5 }, () => fetch(base + '/api/ready')))
      assert(responses.every(response => response.status === 503), 'Timeout returned ready')
      assert(catalogCalls() === 1, 'Concurrent probes were not coalesced')
      assert((await fetch(base + '/api/health')).status === 200, 'Timeout killed liveness')
      const durationMs = performance.now() - started
      assert(durationMs < 6000, 'Readiness timeout was not bounded')
      return { probes: 5, upstreamRequests: catalogCalls(), durationMs, readiness: 503, health: 200 }
    })
  })
} finally { await browser.close() }
