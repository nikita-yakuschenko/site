import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { structure } from '../../config/structure'
import { PagesIndex } from './PagesIndex'
import { CatalogIndex } from './CatalogIndex'

async function StructureView({ view, initPageResult }: AdminViewServerProps & { view: typeof structure[number]['key'] }) {
  if (!initPageResult.req.user) redirect('/login')
  const item = structure.find(item => item.key === view)!
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  if (view === 'blocks' || view === 'forms') redirect(`/collections/${view}`)
  const pages = view === 'pages' ? await initPageResult.req.payload.find({ collection: 'pages', limit: 1000, sort: 'route', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  const projects = view === 'catalog' ? await initPageResult.req.payload.find({ collection: 'projects', limit: 1000, sort: 'name', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
    {view === 'pages' && pages && <PagesIndex siteUrl={siteUrl} pages={pages.docs} />}
    {view === 'catalog' && projects && <CatalogIndex siteUrl={siteUrl} projects={projects.docs} />}
  </div>
}

export function SiteView(props: AdminViewServerProps) { return <StructureView {...props} view="site" /> }
export function PagesView(props: AdminViewServerProps) { return <StructureView {...props} view="pages" /> }
export function CatalogView(props: AdminViewServerProps) { return <StructureView {...props} view="catalog" /> }
export function BlocksView(props: AdminViewServerProps) { return <StructureView {...props} view="blocks" /> }
export function FormsView(props: AdminViewServerProps) { return <StructureView {...props} view="forms" /> }
export function SectionsView(props: AdminViewServerProps) { return <StructureView {...props} view="sections" /> }
export function IntegrationsView(props: AdminViewServerProps) { return <StructureView {...props} view="integrations" /> }
