import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { structure } from '../../config/structure'
import { PagesIndex } from './PagesIndex'
import { CatalogIndex } from './CatalogIndex'
import { PriceImport } from './PriceImport'
import { PricesTable, type PriceTableRow } from './PricesTable'
import { IntegrationsPanel } from './IntegrationsPanel'
import { roistatWebhookEnv } from '../../config/lead-adapters'
import { isPriceKind, summaryConfiguration, type PriceKind } from '../../config/price-kinds'
import { countProjectLeads } from '../../config/catalog-lead-counts'

async function StructureView({ view, initPageResult }: AdminViewServerProps & { view: typeof structure[number]['key'] }) {
  if (!initPageResult.req.user) redirect('/login')
  const item = structure.find(item => item.key === view)!
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  if (view === 'blocks' || view === 'forms') redirect(`/collections/${view}`)
  const pages = view === 'pages' ? await initPageResult.req.payload.find({ collection: 'pages', limit: 1000, sort: 'route', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  const projects = view === 'catalog' ? await initPageResult.req.payload.find({ collection: 'projects', limit: 1000, sort: 'name', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  const submissions = view === 'catalog' ? await initPageResult.req.payload.find({ collection: 'lead-submissions', pagination: false, depth: 0, req: initPageResult.req, overrideAccess: false, select: { status: true, payload: true } }) : null
  const leads = projects && submissions ? Object.fromEntries(countProjectLeads(projects.docs, submissions.docs)) : {}
  const deliveryMode = view === 'integrations' ? await leadDeliveryMode(initPageResult.req) : null
  const priceRows = view === 'prices' ? await priceTable(initPageResult.req) : null
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    {view === 'prices' ? <PriceImport /> : <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>}
    {view === 'prices' && priceRows && <PricesTable rows={priceRows} />}
    {view === 'registers' && <p className="max-w-2xl text-sm text-muted-foreground">{item.description}</p>}
    {view === 'sampling' && <p className="max-w-2xl text-sm text-muted-foreground">{item.description}</p>}
    {view === 'integrations' && <Suspense><IntegrationsPanel deliveryMode={deliveryMode} roistatReady={Boolean(process.env[roistatWebhookEnv])} /></Suspense>}
    {view === 'pages' && pages && <PagesIndex siteUrl={siteUrl} pages={pages.docs} />}
    {view === 'catalog' && projects && <Suspense><CatalogIndex siteUrl={siteUrl} projects={projects.docs} leads={leads} /></Suspense>}
  </div>
}

export function SiteView(props: AdminViewServerProps) { return <StructureView {...props} view="site" /> }
export function PagesView(props: AdminViewServerProps) { return <StructureView {...props} view="pages" /> }
export function CatalogView(props: AdminViewServerProps) { return <StructureView {...props} view="catalog" /> }
export function PricesView(props: AdminViewServerProps) { return <StructureView {...props} view="prices" /> }
export function RegistersView(props: AdminViewServerProps) { return <StructureView {...props} view="registers" /> }
export function SamplingView(props: AdminViewServerProps) { return <StructureView {...props} view="sampling" /> }
export function BlocksView(props: AdminViewServerProps) { return <StructureView {...props} view="blocks" /> }
export function FormsView(props: AdminViewServerProps) { return <StructureView {...props} view="forms" /> }
export function SectionsView(props: AdminViewServerProps) { return <StructureView {...props} view="sections" /> }
export function IntegrationsView(props: AdminViewServerProps) { return <StructureView {...props} view="integrations" /> }

async function leadDeliveryMode(req: AdminViewServerProps['initPageResult']['req']) {
  try {
    const delivery = await req.payload.findGlobal({ slug: 'lead-delivery', req, overrideAccess: false })
    return delivery.mode || null
  } catch {
    return null
  }
}

async function priceTable(req: AdminViewServerProps['initPageResult']['req']): Promise<PriceTableRow[]> {
  const payload = req.payload
  const [projects, prices] = await Promise.all([
    payload.find({ collection: 'projects', pagination: false, sort: 'name', depth: 0, draft: true, req, overrideAccess: false, where: { recordType: { equals: 'project' } } }),
    payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false, where: { configuration: { in: ['standard', 'start'] } } }),
  ])
  const byProject = new Map<number, PriceTableRow['prices']>()
  for (const row of prices.docs) {
    const projectId = typeof row.project === 'number' ? row.project : row.project.id
    const kind = row.region
    if (!isPriceKind(kind) || row.configuration !== summaryConfiguration(kind)) continue
    const cells = byProject.get(projectId) ?? {}
    cells[kind as PriceKind] = { price: row.price, updatedAt: row.updatedAt }
    byProject.set(projectId, cells)
  }
  return projects.docs.map(project => ({ id: project.id, code: project.code ?? null, name: project.name, prices: byProject.get(project.id) ?? {} }))
}
