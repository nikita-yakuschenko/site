// Loopback-only synthetic CMS for AO-03 browser tests. No account or real data.
import { createServer } from 'node:http'
const projects = ['ABCDEF12', 'GHIJKL34'].map((cmsId, index) => ({
  id: `legacy-house-${index}`, cmsId, slug: `ao03-house-${index}`, name: `Тестовый дом ${index + 1}`,
  area: '100', areaValue: 100, floors: '1', floorsValue: 1, bedrooms: '2', bathrooms: '1',
  priceLabel: 'от 5 000 000 руб.', priceAmount: 5_000_000, regionalPrices: { nn: 5_000_000, msk: 6_000_000 },
  imageUrl: '/fixtures/house-1.jpg', technologyBadge: 'Панельно-каркасный', series: 'panel', technology: 'panel',
  href: `/catalog/ao03-house-${index}`, description: 'Синтетический проект', exteriors: [], interiors: [], floorPlans: [], options: [], about: [],
}))
createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3015')
  let body; let status = 200
  if (url.pathname === '/health') body = { ok: true }
  else if (url.pathname === '/api/projects/catalog') body = { items: projects.filter(p => !url.searchParams.has('slug') || p.slug === url.searchParams.get('slug')) }
  else if (url.pathname === '/api/globals/lead-delivery/metrica') body = { enabled: false }
  else if (url.pathname === '/api/globals/lead-delivery/counter') body = { configured: true, projectId: null }
  else if (url.pathname === '/api/blocks/content') body = { blocks: [] }
  else if (url.pathname === '/api/projects/reactions') body = { likes: 8, shares: 0, liked: false }
  else { status = 404; body = {} }
  res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body))
}).listen(3015, '127.0.0.1')
