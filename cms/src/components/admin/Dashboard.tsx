import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { countProjectLeads } from '../../config/catalog-lead-counts'
import { PopularityChart, type PopularityRow } from './OverviewCharts'

function amount(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const [projects, submissions] = await Promise.all([
    req.payload.find({ collection: 'projects', pagination: false, depth: 0, req, overrideAccess: false }),
    req.payload.find({ collection: 'lead-submissions', pagination: false, depth: 0, req, overrideAccess: false, select: { status: true, payload: true } }),
  ])
  const leads = countProjectLeads(projects.docs, submissions.docs)
  const rows: PopularityRow[] = projects.docs
    .map(project => ({ name: project.name || 'Без названия', views: amount(project.viewCount), leads: leads.get(project.id) ?? 0 }))
    .sort((left, right) => right.views - left.views || right.leads - left.leads || left.name.localeCompare(right.name, 'ru'))
  const totals = {
    views: rows.reduce((sum, row) => sum + row.views, 0),
    leads: rows.reduce((sum, row) => sum + row.leads, 0),
    likes: projects.docs.reduce((sum, project) => sum + amount(project.likeCount), 0),
    shares: projects.docs.reduce((sum, project) => sum + amount(project.shareCount), 0),
  }
  const chartRows = rows.filter(row => row.views > 0 || row.leads > 0).slice(0, 12)
  const cards = [
    { label: 'Просмотры', value: totals.views, description: 'Открытия карточек проектов' },
    { label: 'Заявки', value: totals.leads, description: 'Обращения, привязанные к проекту' },
    { label: 'Лайки', value: totals.likes, description: 'Отмеченные проекты' },
    { label: 'Шеры', value: totals.shares, description: 'Отправки ссылки на проект' },
  ]
  return <div className="shadcn-surface flex flex-col gap-6 p-4 lg:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
      <Button asChild variant="outline" size="sm"><Link href="/structure/catalog">Каталог</Link></Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <Card key={card.label} className="shadow-none">
      <CardHeader>
        <CardDescription>{card.label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{card.value.toLocaleString('ru-RU')}</CardTitle>
        <CardDescription>{card.description}</CardDescription>
      </CardHeader>
    </Card>)}</div>
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Популярность проектов</CardTitle>
        <CardDescription>Просмотры карточек считает сайт. Посещаемость всего сайта появится после подключения Яндекс Метрики.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartRows.length ? <PopularityChart rows={chartRows} /> : <p className="text-sm text-muted-foreground">Пока нет просмотров и заявок. Они появятся, когда откроют карточку проекта или отправят форму.</p>}
      </CardContent>
    </Card>
  </div>
}
