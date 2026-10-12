import Link from 'next/link'
import { IconPhoto as Images, IconPlus as Plus, IconUsers as Users, IconArrowUpRight as ArrowUpRight } from '@tabler/icons-react'
import type { AdminViewServerProps } from 'payload'
import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { EmptyState } from './EmptyState'

export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload } = req
  const month = new Date()
  month.setUTCDate(1)
  month.setUTCHours(0, 0, 0, 0)
  const [users, media, monthly, recent] = await Promise.all([
    payload.count({ collection: 'users', req, overrideAccess: false }),
    payload.count({ collection: 'media', req, overrideAccess: false }),
    payload.count({ collection: 'media', req, overrideAccess: false, where: { createdAt: { greater_than_equal: month.toISOString() } } }),
    payload.find({ collection: 'media', req, overrideAccess: false, depth: 0, limit: 8, sort: '-createdAt' }),
  ])
  const stats = [
    { label: 'Медиафайлы', value: media.totalDocs, description: 'Файлы в медиатеке', href: '/collections/media', icon: Images },
    { label: 'Пользователи', value: users.totalDocs, description: 'Доступные вам аккаунты', href: '/collections/users', icon: Users },
    { label: 'Загрузки за месяц', value: monthly.totalDocs, description: 'Новые файлы в этом месяце', href: '/collections/media', icon: Plus },
  ]
  return <div className="shadcn-surface @container/main flex flex-col gap-6 p-4 lg:p-6">
    <h1 className="text-2xl font-semibold tracking-tight">Панель управления</h1>
    <div className="grid gap-4 md:grid-cols-3">{stats.map(stat => <Card key={stat.label} className="shadow-none">
      <CardHeader><CardDescription>{stat.label}</CardDescription><CardTitle className="text-3xl font-semibold tabular-nums">{stat.value.toLocaleString('ru-RU')}</CardTitle></CardHeader>
      <CardFooter className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{stat.description}</span><Button asChild variant="ghost" size="icon" aria-label={`Открыть: ${stat.label}`}><Link href={stat.href}><stat.icon /></Link></Button></CardFooter>
    </Card>)}</div>
    <Card className="gap-4 shadow-none"><CardHeader className="flex flex-wrap items-center justify-between gap-4"><div className="space-y-1"><CardTitle>Последние загрузки</CardTitle><CardDescription>Недавно добавленные медиафайлы</CardDescription></div><Button asChild variant="outline" size="sm"><Link href="/collections/media">Вся медиатека<ArrowUpRight /></Link></Button></CardHeader>
      <CardContent>{recent.docs.length ? <Table><TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Файл</TableHead><TableHead className="text-right">Добавлен</TableHead></TableRow></TableHeader><TableBody>{recent.docs.map(file => <TableRow key={file.id}>
        <TableCell className="font-medium"><Link href={`/collections/media/${file.id}`} className="hover:underline">{file.title}</Link></TableCell><TableCell className="text-muted-foreground">{file.filename}</TableCell><TableCell className="text-right tabular-nums">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'Europe/Moscow' }).format(new Date(file.createdAt))}</TableCell>
      </TableRow>)}</TableBody></Table> : <EmptyState icon={<Images />} title="Пока нет медиафайлов" description="Файлы, добавленные в медиатеку, появятся здесь." />}</CardContent>
    </Card>
  </div>
}
