import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { structure } from '../../config/structure'
import { PagesIndex } from './PagesIndex'
import { CatalogIndex } from './CatalogIndex'
import { PriceImport } from './PriceImport'
import { PricesTable, type PriceTableRow } from './PricesTable'
import Link from 'next/link'
import { priceKindsInForm, type PriceKind } from '../../config/price-kinds'

async function StructureView({ view, initPageResult }: AdminViewServerProps & { view: typeof structure[number]['key'] }) {
  if (!initPageResult.req.user) redirect('/login')
  const item = structure.find(item => item.key === view)!
  const siteUrl = process.env.SITE_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://new.avgst.ru' : 'http://localhost:3000')
  if (view === 'blocks' || view === 'forms') redirect(`/collections/${view}`)
  const pages = view === 'pages' ? await initPageResult.req.payload.find({ collection: 'pages', limit: 1000, sort: 'route', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  const projects = view === 'catalog' ? await initPageResult.req.payload.find({ collection: 'projects', limit: 1000, sort: 'name', depth: 0, req: initPageResult.req, overrideAccess: false }) : null
  const priceRows = view === 'prices' ? await priceTable(initPageResult.req) : null
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    {view === 'prices' ? <PriceImport /> : <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>}
    {view === 'prices' && priceRows && <PricesTable rows={priceRows} />}
    {view === 'registers' && <p className="max-w-2xl text-sm text-muted-foreground">{item.description}</p>}
    {view === 'sampling' && <p className="max-w-2xl text-sm text-muted-foreground">{item.description}</p>}
    {view === 'integrations' && <div className="rounded-xl border p-4 flex flex-col gap-3"><h2 className="text-lg font-semibold">Передача заявок</h2><p className="text-sm text-muted-foreground">Формы передают данные общему обработчику. Здесь выбирается тестовый режим или отправка через API / вебхук.</p><Link href="/globals/lead-delivery">Настроить отправку заявок</Link><Link href="/collections/lead-submissions">Посмотреть отправки форм</Link></div>}
    {view === 'pages' && pages && <PagesIndex siteUrl={siteUrl} pages={pages.docs} />}
    {view === 'catalog' && projects && <CatalogIndex siteUrl={siteUrl} projects={projects.docs} />}
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

async function priceTable(req: AdminViewServerProps['initPageResult']['req']): Promise<PriceTableRow[]> {
  const payload = req.payload
  const [projects, prices] = await Promise.all([
    payload.find({ collection: 'projects', pagination: false, sort: 'name', depth: 0, draft: true, req, overrideAccess: false, where: { recordType: { equals: 'project' } } }),
    payload.find({ collection: 'project-prices', pagination: false, depth: 0, req, overrideAccess: false, where: { configuration: { equals: 'standard' } } }),
  ])
  const byProject = new Map<number, PriceTableRow['prices']>()
  for (const row of prices.docs) {
    const projectId = typeof row.project === 'number' ? row.project : row.project.id
    const kind = row.region
    if (!priceKindsInForm.some(item => item.value === kind)) continue
    const cells = byProject.get(projectId) ?? {}
    cells[kind as PriceKind] = { price: row.price, updatedAt: row.updatedAt }
    byProject.set(projectId, cells)
  }
  return projects.docs.map(project => ({ id: project.id, code: project.code ?? null, name: project.name, prices: byProject.get(project.id) ?? {} }))
}
