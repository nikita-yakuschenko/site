import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const [workspaceArg, outputArg, label = 'before'] = process.argv.slice(2)
if (!workspaceArg || !outputArg) throw new Error('Usage: node scripts/check-style-snapshot.mjs <built-workspace> <output> <before|after>')
const workspace = path.resolve(workspaceArg), output = path.resolve(outputArg)
fs.mkdirSync(output, { recursive: true })
for (const relative of ['public', '.next/static']) {
  const target = path.join(workspace, '.next/standalone', relative)
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(workspace, relative), target, process.platform === 'win32' ? 'junction' : 'dir')
}
const socket = http.createServer()
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
const port = socket.address().port
await new Promise(resolve => socket.close(resolve))
const server = spawn(process.execPath, ['server.js'], { cwd: path.join(workspace, '.next/standalone'), stdio: 'ignore', env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', CMS_PUBLIC_URL: 'http://127.0.0.1:9', CMS_SITE_API_KEY: '', BROWSER_DIAGNOSTICS_FIXTURE_CATALOG: '1' } })
const base = `http://127.0.0.1:${port}`
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const browser = await chromium.launch()
const results = []
try {
  let ready = false
  for (let n = 0; n < 100; n++) { try { if ((await fetch(base + '/api/health')).ok) { ready = true; break } } catch {} await sleep(100) }
  if (!ready) throw new Error('Standalone server did not start')
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await context.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === base ? route.continue() : route.abort())
    const page = await context.newPage()
    for (const route of ['/', '/catalog', '/catalog/barhhouse-73', '/about', '/manufacture', '/business', '/mortgage', '/referral', '/privacy', '/exposition']) {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' })
      if (response.status() !== 200) throw new Error(`${route}: ${response.status()}`)
      await page.waitForFunction(() => document.documentElement.dataset.appHydrated === 'true')
      await page.evaluate(() => document.fonts.ready)
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' })
      await sleep(350)
      const rows = await page.evaluate(() => {
        const properties = ['display','position','font-family','font-size','font-weight','line-height','letter-spacing','color','background-color','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','border-radius','gap','grid-template-columns','flex-direction','align-items','justify-content','overflow','object-fit','width','height','min-width','max-width','box-sizing']
        return [...document.querySelectorAll('body *')].filter(el => !['SCRIPT','STYLE','LINK','META','NOSCRIPT'].includes(el.tagName) && !el.closest('svg')).map(el => {
          const style = getComputedStyle(el)
          // Typed OM retains computed `auto` instead of snapshotting a transient
          // used flex margin. Width/height constraints are checked separately.
          const typed = el.computedStyleMap()
          return { tag: el.tagName, classes: [...el.classList].filter(value => value !== 'is-loaded').sort().join(' '), css: properties.map(key => typed.get(key)?.toString() ?? style.getPropertyValue(key)).join('|') }
        })
      })
      const key = `${width}-${route.replaceAll('/', '_') || 'home'}`
      fs.writeFileSync(path.join(output, `${label}-${key}.json`), JSON.stringify(rows))
      const result = { width, route, elements: rows.length, differences: [] }
      if (label === 'after') {
        const before = JSON.parse(fs.readFileSync(path.join(output, `before-${key}.json`), 'utf8'))
        for (let i = 0; i < Math.max(before.length, rows.length); i++) if (JSON.stringify(before[i]) !== JSON.stringify(rows[i])) result.differences.push({ index: i, before: before[i], after: rows[i] })
      }
      results.push(result)
      fs.writeFileSync(path.join(output, `${label}-style-summary.json`), JSON.stringify(results, null, 2))
      console.log(JSON.stringify({ ...result, differences: result.differences.length }))
    }
    await context.close()
  }
  if (results.some(row => row.differences.length)) process.exitCode = 1
} finally { await browser.close(); server.kill() }
