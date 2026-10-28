import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

// Tools are installed in an isolated directory, never added to the app lockfile.
const [workspaceArg, toolsArg, outputArg, label = 'baseline'] = process.argv.slice(2)
if (!workspaceArg || !toolsArg || !outputArg) throw new Error('Usage: node scripts/measure-mobile-critical-path.mjs <built-workspace> <tools-node_modules> <output> <label>')
const workspace = path.resolve(workspaceArg), toolsRoot = path.resolve(toolsArg), output = path.resolve(outputArg)
const { default: lighthouse } = await import(pathToFileURL(path.join(toolsRoot, 'lighthouse/core/index.js')).href)
const chromeLauncher = await import(pathToFileURL(path.join(toolsRoot, 'chrome-launcher/dist/index.js')).href)
fs.mkdirSync(output, { recursive: true })
for (const relative of ['public', '.next/static']) {
  const target = path.join(workspace, '.next/standalone', relative)
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(workspace, relative), target, process.platform === 'win32' ? 'junction' : 'dir')
}
const socket = http.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const log = fs.openSync(path.join(output, `${label}-server.log`), 'w')
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(workspace, '.next/standalone'), stdio: ['ignore', log, log],
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port), NODE_ENV: 'production', CMS_PUBLIC_URL: 'http://127.0.0.1:9', CMS_SITE_API_KEY: '', BROWSER_DIAGNOSTICS_FIXTURE_CATALOG: '1' },
})
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const base = `http://127.0.0.1:${port}`
const results = []
try {
  let ready = false
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch { /* startup */ }
    await sleep(100)
  }
  if (!ready) throw new Error('Standalone server did not start')
  const identity = await (await fetch(base + '/api/health')).json()
  for (let run = 1; run <= 5; run++) {
    const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] })
    try {
      const { lhr } = await lighthouse(base + '/', {
        port: chrome.port, logLevel: 'error', onlyCategories: ['performance'], formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
        blockedUrlPatterns: ['*mc.yandex.*', '*roistat.com*', '*one2click.ru*', '*top-fwz1.mail.ru*', '*privacy-cs.mail.ru*', '*/api/views*', '*/api/reactions*', '*/api/consent*', '*/next/leads*'],
      })
      if (lhr.runtimeError) throw new Error(lhr.runtimeError.message)
      fs.writeFileSync(path.join(output, `${label}-${run}.json`), JSON.stringify(lhr))
      const requests = lhr.audits['network-requests'].details.items.filter(item => item.url.startsWith(base))
      const asset = type => requests.filter(item => item.resourceType === type).reduce((sum, item) => sum + (item.transferSize || 0), 0)
      const row = { label, run, lighthouseVersion: lhr.lighthouseVersion, buildId: identity.buildId,
        score: Math.round(lhr.categories.performance.score * 100),
        fcpMs: lhr.audits['first-contentful-paint'].numericValue, lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
        tbtMs: lhr.audits['total-blocking-time'].numericValue, cls: lhr.audits['cumulative-layout-shift'].numericValue,
        cssTransferBytes: asset('Stylesheet'), jsTransferBytes: asset('Script'),
        requests: requests.filter(item => ['Script', 'Stylesheet'].includes(item.resourceType)).map(({ url, resourceType, transferSize, resourceSize }) => ({ path: new URL(url).pathname, resourceType, transferSize, resourceSize })),
      }
      results.push(row)
      fs.writeFileSync(path.join(output, `${label}-summary.json`), JSON.stringify(results, null, 2))
      console.log(JSON.stringify({ ...row, requests: undefined }))
    } finally { await chrome.kill() }
  }
} finally { server.kill(); fs.closeSync(log) }
