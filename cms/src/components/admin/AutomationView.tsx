import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { ReferralWorkspace } from './AutomationPanel'
import { Suspense } from 'react'
import { ParticipantsIndex } from './ParticipantsIndex'
import { EventsIndex } from './EventsIndex'
import { CMSMailSettings, SettingsTabs, AccountSettings } from './CMSSettings'
import { activeStaff } from '../../access/staff'
export async function ReferralView({ initPageResult }: AdminViewServerProps) {
  if (!initPageResult.req.user) redirect('/login')
  const req = initPageResult.req
  const participants = await req.payload.find({ collection: 'referral-participants', sort: '-createdAt', pagination: false, req, overrideAccess: false, select: { name: true, email: true, phone: true, code: true, status: true, confirmedAt: true, createdAt: true } })
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Реферальная программа</h1><Suspense><ReferralWorkspace participants={participants.docs} total={participants.totalDocs} /></Suspense></div>
}
export async function RegistrationsView({ initPageResult }: AdminViewServerProps) {
  const req = initPageResult.req
  if (!req.user) redirect('/login')
  const [rows, events] = await Promise.all([
    req.payload.find({ collection: 'event-registrations', sort: '-createdAt', pagination: false, req, overrideAccess: false, select: { name: true, email: true, phone: true, eventSlug: true, status: true, confirmedAt: true, createdAt: true } }),
    req.payload.find({ collection: 'events', pagination: false, req, overrideAccess: false, select: { title: true, slug: true } }),
  ])
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Регистрации на мероприятия</h1><Suspense><ParticipantsIndex rows={rows.docs} flow="event" events={events.docs.map(event => ({ value: event.slug, label: event.title }))} /></Suspense></div>
}
export function ReferralListRedirect() { redirect('/referral') }
export function RegistrationsListRedirect() { redirect('/event-registrations') }
export function EventsListRedirect() { redirect('/events') }
export async function EventsView({ initPageResult }: AdminViewServerProps) {
  const req = initPageResult.req
  if (!req.user) redirect('/login')
  const [events, registrations] = await Promise.all([
    req.payload.find({ collection: 'events', sort: '-startsAt', pagination: false, req, overrideAccess: false, select: { title: true, slug: true, status: true, startsAt: true, timezone: true } }),
    req.payload.find({ collection: 'event-registrations', pagination: false, req, overrideAccess: false, select: { eventSlug: true } }),
  ])
  const counts: Record<string, number> = {}
  for (const row of registrations.docs) counts[row.eventSlug] = (counts[row.eventSlug] || 0) + 1
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Мероприятия</h1><Suspense><EventsIndex events={events.docs} registrations={counts} /></Suspense></div>
}
export async function CMSSettingsView({ initPageResult }: AdminViewServerProps) {
  const user = await activeStaff(initPageResult.req)
  if (!user) redirect('/login')
  if (user.role !== 'super-admin') redirect('/account')
  return <div className="shadcn-surface cms-settings flex max-w-5xl flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Настройки</h1><SettingsTabs /><CMSMailSettings /></div>
}

export async function AccountSettingsView({ initPageResult }: AdminViewServerProps) {
  const user = await activeStaff(initPageResult.req)
  if (!user) redirect('/login')
  return <div className="shadcn-surface cms-settings flex max-w-5xl flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Настройки</h1><SettingsTabs /><AccountSettings /></div>
}
