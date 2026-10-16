'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project } from '../../payload-types'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconExternalLink, IconSearch, IconTrash, IconDots, IconPencil, IconCircleCheckFilled, IconCircleDashed } from '@tabler/icons-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ChoiceSelect } from './ChoiceSelect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

export function CatalogIndex({ siteUrl, projects }: { siteUrl: string; projects: Project[] }) {
  const [search, setSearch] = useState('')
  const [recordType, setRecordType] = useState('all')
  const [removing, setRemoving] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const remove = async () => {
    if (!removing) return
    setBusy(true)
    const response = await fetch(`/api/projects/${removing.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return void toast.error('Не удалось удалить запись')
    toast.success('Запись удалена')
    setRemoving(null)
    router.refresh()
  }
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = projects.filter(project => (recordType === 'all' || project.recordType === recordType) && `${project.name ?? ''} ${project.slug ?? ''} ${project.technologyBadge ?? ''}`.toLocaleLowerCase('ru').includes(query))
  const table = useDataPage(filtered)
  return <>
    <div className="flex items-center justify-between gap-3"><div className="relative w-full max-w-lg">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label="Поиск проектов" placeholder="Поиск проектов" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} />
    </div><ChoiceSelect label="Тип записи" className="w-48" value={recordType} options={{ all: 'Все записи', project: 'Проекты домов', 'ready-home': 'Готовые дома' }} onChange={value => { setRecordType(value); table.setPage(0) }} /><Button asChild><Link href="/collections/projects/create">Создать</Link></Button></div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground"><TableHead className="pl-4">Название</TableHead><TableHead>Статус</TableHead><TableHead>Тип</TableHead><TableHead>Технология</TableHead><TableHead className="text-right">Площадь, м²</TableHead><TableHead className="text-right">Этажи</TableHead><TableHead className="text-right">Спальни</TableHead><TableHead className="text-right">Цена, ₽</TableHead><TableHead className="w-12 pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{table.rows.map(project => { const published = project._status === 'published'; return <TableRow key={project.id}>
        <TableCell className="h-12 whitespace-nowrap pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/projects/${project.id}`}>{project.name || '[Без названия]'}</Link></TableCell>
        <TableCell><Badge variant="outline" className="text-foreground">{published ? <IconCircleCheckFilled className="text-[var(--avgst-green)]" /> : <IconCircleDashed className="text-muted-foreground" />}{published ? 'Опубликован' : 'Черновик'}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{project.recordType === 'ready-home' ? 'Готовый дом' : 'Проект дома'}</TableCell>
        <TableCell className="text-muted-foreground">{project.technologyBadge === 'Модульный' ? 'Модульная' : 'Панельно-каркасная'}</TableCell><TableCell className="text-right tabular-nums">{project.areaValue?.toLocaleString('ru-RU') ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.floorsValue ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.bedrooms ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{(price => price ? `${project.recordType === 'ready-home' ? '' : 'от '}${price.toLocaleString('ru-RU')}` : '—')(project.recordType === 'ready-home' ? project.readyHome?.salePrice : project.priceAmount)}</TableCell>
        <TableCell className="pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" aria-label={`Действия: ${project.name || 'без названия'}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44">
          <DropdownMenuItem asChild><Link href={`/collections/projects/${project.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem>
          {published && project.slug && <DropdownMenuItem asChild><a href={`${siteUrl}/catalog/${project.slug}`} target="_blank" rel="noreferrer"><IconExternalLink />Открыть на сайте</a></DropdownMenuItem>}
          <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(project)}><IconTrash />Удалить</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow> })}{table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody>
    </Table></DataTableFrame>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>Удалить «{removing?.name || '[Без названия]'}»?</DialogTitle><DialogDescription>Запись пропадёт из каталога и с сайта вместе с её ценами. Отменить удаление нельзя.</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Отмена</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
