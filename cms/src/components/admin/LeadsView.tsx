import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { LeadsIndex, type LeadRow } from './LeadsIndex'
import { activeStaff } from '../../access/staff'
import { resolveLeadClassification } from '../../config/lead-classification'

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

export async function LeadsView({ initPageResult }: AdminViewServerProps) {
  if (!initPageResult.req.user) redirect('/login')
  const user = await activeStaff(initPageResult.req)
  if (!user) redirect('/login')
  const submissions = await initPageResult.req.payload.find({ collection: 'lead-submissions', sort: '-createdAt', limit: 1000, depth: 0, req: initPageResult.req, overrideAccess: false })
  const rows: LeadRow[] = submissions.docs.map(doc => {
    const payload = doc.payload && typeof doc.payload === 'object' && !Array.isArray(doc.payload) ? doc.payload : {}
    return { id: doc.id, title: text(doc.title) || text(payload.title) || 'Заявка', name: text(payload.name), phone: text(payload.phone), formId: doc.formId, status: doc.status, createdAt: doc.createdAt, ...resolveLeadClassification(doc) }
  })
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    <h1 className="text-2xl font-semibold tracking-tight">Заявки</h1>
    <LeadsIndex rows={rows} editable={['super-admin', 'admin'].includes(user.role)} />
  </div>
}

export function LeadsListRedirect() {
  redirect('/leads')
}
