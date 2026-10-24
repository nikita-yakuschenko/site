import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { AutomationPanel, EventMailing, ReferralWorkspace } from './AutomationPanel'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
export async function ReferralView({ initPageResult }: AdminViewServerProps) {
  if (!initPageResult.req.user) redirect('/login')
  const req = initPageResult.req
  const participants = await req.payload.find({ collection: 'referral-participants', sort: '-createdAt', limit: 50, req, overrideAccess: false })
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6"><h1 className="text-2xl font-semibold tracking-tight">Реферальная программа</h1><ReferralWorkspace participants={participants.docs} total={participants.totalDocs} /></div>
}
export async function EventsView({ initPageResult }: AdminViewServerProps) {
  const req = initPageResult.req
  if (!req.user) redirect('/login')
  const events = await req.payload.find({ collection: 'events', sort: '-startsAt', limit: 100, req, overrideAccess: false })
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold tracking-tight">Мероприятия</h1><Button asChild><Link href="/collections/events/create">Создать мероприятие</Link></Button></div><p className="max-w-2xl text-sm text-muted-foreground">В записи мероприятия задаются дата, программа, место, правила регистрации, письма и автоматическое напоминание. Заявки сохраняются в CMS; подтверждение email относится только к выбранному мероприятию.</p>{events.docs.map(event => <Card key={event.id} className="shadow-none"><CardContent className="flex flex-col gap-5 py-6"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-base font-semibold">{event.title}</h2><span className="text-sm text-muted-foreground">{new Date(event.startsAt).toLocaleDateString('ru-RU')} · {{ draft: 'Черновик', published: 'Опубликовано', completed: 'Завершено', cancelled: 'Отменено' }[event.status || 'draft']}</span></div><div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`/collections/events/${event.id}`}>Настройки и программа</Link></Button><Button asChild variant="outline"><Link href={`/collections/event-registrations?where[eventSlug][equals]=${encodeURIComponent(event.slug)}`}>Регистрации</Link></Button></div>{event.status === 'published' && <EventMailing eventSlug={event.slug} />}</CardContent></Card>)}<AutomationPanel section="mail" /><Link href="/collections/automation-jobs" className="text-sm underline">Очередь и журнал обработки</Link></div>
}
