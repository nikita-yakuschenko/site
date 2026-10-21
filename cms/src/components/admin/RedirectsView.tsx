import { isStandardRecord } from '../../seed/standard-site'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { RedirectsIndex } from './RedirectsIndex'

export async function RedirectsView({ initPageResult }: AdminViewServerProps) {
  const req = initPageResult.req
  if (!req.user) redirect('/login')
  const [rules, pages, projects] = await Promise.all([
    req.payload.find({ collection: 'pages', pagination: false, sort: 'route', depth: 0, req, overrideAccess: false, where: { kind: { equals: 'redirect' } } }),
    req.payload.find({ collection: 'pages', pagination: false, sort: 'title', depth: 0, req, overrideAccess: false, where: { _status: { equals: 'published' } } }),
    req.payload.find({ collection: 'projects', pagination: false, sort: 'name', depth: 0, req, overrideAccess: false, where: { _status: { equals: 'published' } } }),
  ])
  const targets = [
    { title: 'Каталог — модульные дома', path: '/catalog?tech=modular' },
    { title: 'Каталог — панельно-каркасные дома', path: '/catalog?tech=panel' },
    ...pages.docs.filter(page => page.route && !page.route.includes('[') && !['template', 'preview', 'redirect'].includes(page.kind)).map(page => ({ title: page.title || page.route!, path: page.route! })),
    ...projects.docs.filter(project => project.slug).map(project => ({ title: project.name, path: `/catalog/${project.slug}` })),
  ]
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    <h1 className="text-2xl font-semibold tracking-tight">Редиректы</h1>
    <RedirectsIndex rows={rules.docs.filter(rule => !isStandardRecord('pages', rule)).map(rule => ({ id: rule.id, source: rule.route || '', target: rule.redirect || '', published: rule._status === 'published' }))} targets={targets} />
  </div>
}
