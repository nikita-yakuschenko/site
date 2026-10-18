import { readFile, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { chromium } from '@playwright/test'

// Write tests are deliberately restricted to the local CMS. Every change is
// restored before the next case; no marker is ever sent to production.
const cms = new URL(process.env.CMS_TEST_URL || 'http://localhost:3001')
const site = new URL(process.env.SITE_TEST_URL || 'http://localhost:3000')
if (![cms, site].every(url => ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Проверки сохранения разрешены только на локальном окружении')
const credentials = parseEnv(await readFile('cms/.env.local-admin', 'utf8'))
const login = await fetch(new URL('/api/users/login', cms), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }).then(response => response.json())
if (!login.token) throw new Error('Нет локальной сессии CMS')
const headers = { Authorization: `JWT ${login.token}`, 'Content-Type': 'application/json' }
async function api(path, data) {
  const response = await fetch(new URL(`/api/${path}`, cms), { headers, ...(data ? { method: 'PATCH', body: JSON.stringify(data) } : {}) })
  if (!response.ok) throw new Error(`CMS ${path}: HTTP ${response.status}`)
  return response.json()
}
const pages = (await api('pages?limit=300&depth=0')).docs
const blocks = (await api('blocks?limit=500&depth=0')).docs
const media = (await api('media?limit=1500&depth=0')).docs
const used = new Set(pages.flatMap(page => (page.layout || []).filter(row => row.component.relationTo === 'blocks').map(row => String(row.component.value))))
const targets = blocks.filter(block => (!process.env.CMS_TEST_BLOCK || block.key === process.env.CMS_TEST_BLOCK) && used.has(String(block.id)) && block.defaults?.contentBinding === 'react' && !block.defaults?.structureOnly && block.parts?.some(part => part.key.includes('.content.')))
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const report = process.env.CMS_TEST_BLOCK ? JSON.parse(await readFile('docs/cms-page-content-check.json', 'utf8')).filter(item => item.key !== process.env.CMS_TEST_BLOCK) : []
try {
  for (const block of targets) {
    const owner = pages.find(owner => owner.layout?.some(row => row.component.relationTo === 'blocks' && String(row.component.value) === String(block.id)))
    let route = block.defaults.contentScope || owner?.route || '/'
    if (route.includes('[') || route.startsWith('/preview/')) route = '/catalog/barnhouse-113'
    const text = block.parts.find(part => part.text?.trim() && !part.key.includes('.prop.')) || block.parts.find(part => part.text?.trim())
    const link = block.parts.find(part => part.href?.trim())
    const image = block.parts.find(part => part.key.endsWith('.image'))
    for (const [kind, part] of [['text', text], ['link', link], ['image', image]]) {
      if (!part) continue
      const marker = `CMS_TEST_${block.id}_${kind}`
      const other = media.find(item => item.description?.startsWith('cms-source:') && item.id !== part.image && item.filename)
      if (kind === 'image' && !other) throw new Error('Нет тестового изображения')
      const patch = kind === 'text' ? { text: marker } : kind === 'link' ? { href: `/__cms_test/${marker}` } : { image: other.id }
      const changed = block.parts.map(item => item.key === part.key ? { ...item, ...patch } : item)
      try {
        await api(`blocks/${block.id}`, { parts: changed })
        const stored = await api(`blocks/${block.id}?depth=0`)
        if (stored.parts.find(item => item.key === part.key)?.[Object.keys(patch)[0]] !== Object.values(patch)[0]) throw new Error('Значение не сохранилось')
        await page.goto(new URL(route, site).href, { timeout: 90000, waitUntil: 'domcontentloaded' })
        await page.waitForFunction(({ kind, marker, filename }) => {
          if (kind === 'text') {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
            let node
            while ((node = walker.nextNode())) if (!node.parentElement?.closest('script,style') && node.textContent?.includes(marker)) return true
            return false
          }
          return [...document.querySelectorAll('[href],[src],[srcset],[poster]')].some(element => ['href', 'src', 'srcset', 'poster'].some(attribute => decodeURIComponent(element.getAttribute(attribute) || '').includes(kind === 'image' ? filename : marker)))
        }, { kind, marker, filename: other?.filename || '' }, { timeout: 15000 })
        report.push({ id: block.id, key: block.key, route, kind, result: 'passed' })
      } catch (error) {
        report.push({ id: block.id, key: block.key, route, kind, result: 'failed', error: error.message })
      } finally {
        await api(`blocks/${block.id}`, { parts: block.parts })
        await writeFile('docs/cms-page-content-check.json', JSON.stringify(report, null, 2) + '\n')
      }
    }
    console.log(block.key, report.filter(item => item.id === block.id).every(item => item.result === 'passed') ? 'passed' : 'FAILED')
  }
} finally { await browser.close() }
const failed = report.filter(item => item.result !== 'passed')
console.log(`${report.length - failed.length}/${report.length} проверок сохранения и отображения пройдено`)
if (failed.length) process.exitCode = 1
