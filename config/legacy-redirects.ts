// Existing project addresses at the time of the site migration.
const projects = new Set(['barhhouse-73', 'barnhouse-115', 'barnhouse-129', 'barnhouse-134', 'barnhouse-138', 'barnhouse-76', 'barnhouse-86', 'barnhouse-90', 'barnhouse-96', 'barnhouse-98', 'barnhuose-82', 'barnouse-122', 'cube-100', 'duplex-173', 'ekohouse-120', 'ekohouse-128', 'ekohouse-132', 'ekohouse-184', 'finlyandiya-149', 'frame-59', 'frame-60', 'kamelot-101', 'kamelot-124', 'norvegiya-115', 'norvegiya-132', 'norvegiya-132-gremyachki', 'norvegiya-92', 'scandi-90', 'shvedskii-121', 'shvedskii-124', 'shvedskii-130', 'shvedskii-135', 'shvedskii-142', 'shvedskii-150', 'shvedskii-161', 'uzorye-115', 'uzorye-122', 'uzorye-132'])

// Explicit aliases also apply inside the old nested product routes.
const aliases: Record<string, string> = {
  'swened-135': 'sweden-135',
  'shvedskii-135': 'sweden-135',
}

export function legacyRedirect(source: URL): { url: URL; status: 307 | 308 } | null {
  const path = source.pathname.replace(/\/+$/, '')
  const url = new URL(source)
  if (path === '/articles' || path.startsWith('/articles/')) {
    url.protocol = 'https:'
    url.host = 'old.avgst.ru'
    url.port = ''
    return { url, status: 307 }
  }
  const section = /^\/catalog\/(modulnye-doma|panelno-karkasnye-doma)(?:\/(.*))?$/.exec(path)
  if (section) {
    const product = /^product\/([^/]+)$/.exec(section[2] || '')
    const slug = product?.[1]
    if (slug && (aliases[slug] || projects.has(slug))) url.pathname = `/catalog/${aliases[slug] || slug}`
    else {
      url.pathname = '/catalog'
      url.searchParams.set('tech', section[1] === 'modulnye-doma' ? 'modular' : 'panel')
    }
  } else if (path === '/catalog/doma') {
    url.pathname = '/catalog'
    const query = [...url.searchParams].find(([key]) => /^tfc_query\[/.test(key))?.[1]
    if (query) url.searchParams.set('q', query)
  } else if (/^\/catalog\/[^/]+$/.test(path) && aliases[path.slice('/catalog/'.length)]) url.pathname = `/catalog/${aliases[path.slice('/catalog/'.length)]}`
  else return null
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('tfc_')) url.searchParams.delete(key)
  }
  return { url, status: 308 }
}
