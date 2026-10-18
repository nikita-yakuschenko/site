import { readFile, unlink, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { chromium } from '@playwright/test'

const cms = new URL(process.env.CMS_TEST_URL || 'http://localhost:3001')
const site = new URL(process.env.SITE_TEST_URL || 'http://localhost:3000')
let pages
let readySlug = process.env.CMS_READY_SLUG
let projectSlug = process.env.CMS_PROJECT_SLUG || 'barnhouse-113'
if (process.env.CMS_AUDIT_INDEX) {
  pages = JSON.parse(await readFile(process.env.CMS_AUDIT_INDEX, 'utf8')).pages
} else {
  if (!['localhost', '127.0.0.1'].includes(cms.hostname)) throw new Error('Для production передайте read-only индекс CMS_AUDIT_INDEX')
  const credentials = parseEnv(await readFile('cms/.env.local-admin', 'utf8'))
  const login = await fetch(new URL('/api/users/login', cms), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }).then(response => response.json())
  if (!login.token) throw new Error('Нет локальной сессии CMS')
  const headers = { Authorization: `JWT ${login.token}` }
  const get = async path => fetch(new URL(`/api/${path}`, cms), { headers }).then(response => response.json())
  const records = (await get('pages?limit=300&depth=1')).docs
  const projects = (await get('projects?limit=300&depth=0&where[_status][equals]=published')).docs
  projectSlug = projects.find(project => project.recordType !== 'ready-home')?.slug || projectSlug
  readySlug = projects.find(project => project.recordType === 'ready-home')?.slug
  pages = records.map(page => ({ id: page.id, route: page.route, kind: page.kind, blocks: (page.layout || []).map(row => row.component.value).filter(value => typeof value === 'object' && value).map(block => ({ key: block.key, title: block.title })) }))
}
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const report = []
let currentRoute = ''
const harness = 'cms/public/_cms-preview-test.html'
await writeFile(harness, '<!doctype html><html><head><title>Проверка превью</title></head><body></body></html>')
try {
  for (const owner of pages) {
    if (owner.kind === 'redirect') { report.push({ route: owner.route, result: 'redirect', blocks: 0 }); continue }
    let loaded = ''
    for (const block of owner.blocks) {
      const route = owner.route.includes('[') || owner.kind === 'preview' ? `/catalog/${block.key === 'ReadyHomeOffer' && readySlug ? readySlug : projectSlug}` : owner.route
      if (block.key === 'ReadyHomeOffer' && !readySlug && !process.env.CMS_AUDIT_INDEX) {
        report.push({ route: owner.route, key: block.key, result: 'conditional', reason: 'В тестовой базе нет опубликованного готового дома' }); continue
      }
      try {
        if (!/[А-Яа-яЁё]/.test(block.title || '')) throw new Error('Название блока не переведено')
        if (loaded !== route) {
          currentRoute = route
          await page.goto('http://localhost:3001/_cms-preview-test.html')
          const target = new URL(currentRoute, site)
          target.searchParams.set('cmsPreview', '1')
          await page.evaluate(url => {
            window.results = []
            window.ready = false
            window.addEventListener('message', event => {
              if (event.data?.type === 'avgst:preview-ready') window.ready = true
              if (event.data?.type === 'avgst:preview-block-status') window.results.push(event.data)
            })
            const frame = document.createElement('iframe')
            frame.src = url
            frame.style = 'width:1920px;height:1080px;border:0'
            document.body.append(frame)
          }, target.href)
          await page.waitForFunction(() => window.ready, null, { timeout: 60000 })
          loaded = route
        }
        await page.evaluate(({ key, origin }) => { window.results = []; document.querySelector('iframe').contentWindow.postMessage({ type: 'avgst:preview-block', key, dim: true }, origin) }, { key: block.key, origin: site.origin })
        await page.waitForFunction(key => window.results.some(result => result.key === key), block.key, { timeout: 10000 })
        const found = await page.evaluate(key => window.results.find(result => result.key === key).found, block.key)
        if (!found) throw new Error('Блок не найден в превью')
        report.push({ route: owner.route, key: block.key, result: 'passed' })
      } catch (error) { report.push({ route: owner.route, key: block.key, result: 'failed', error: error.message }) }
      await writeFile('docs/cms-page-preview-check.json', JSON.stringify(report, null, 2) + '\n')
    }
    console.log(owner.route, report.filter(item => item.route === owner.route && item.result === 'failed').length ? 'FAILED' : 'passed')
  }
} finally { await browser.close(); await unlink(harness) }
const failed = report.filter(item => item.result === 'failed')
console.log(`${report.filter(item => item.result === 'passed').length} превью проверено; ошибок: ${failed.length}`)
if (failed.length) process.exitCode = 1
