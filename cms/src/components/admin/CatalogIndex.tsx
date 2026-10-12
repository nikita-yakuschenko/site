'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project } from '../../payload-types'
import { IconExternalLink, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

export function CatalogIndex({ siteUrl, projects }: { siteUrl: string; projects: Project[] }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [recordType, setRecordType] = useState('all')
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = projects.filter(project => (recordType === 'all' || project.recordType === recordType) && `${project.name} ${project.slug} ${project.technologyBadge}`.toLocaleLowerCase('ru').includes(query))
  const lastPage = Math.max(0, Math.ceil(filtered.length / 20) - 1)
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20)
  return <>
    <div className="flex items-center justify-between gap-3"><div className="relative w-full max-w-lg">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label="Поиск проектов" placeholder="Поиск проектов" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
    </div><Select value={recordType} onValueChange={value => { setRecordType(value); setPage(0) }}><SelectTrigger className="w-48" aria-label="Тип записи"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все записи</SelectItem><SelectItem value="project">Проекты домов</SelectItem><SelectItem value="ready-home">Готовые дома</SelectItem></SelectContent></Select><Button asChild><Link href="/collections/projects/create">Создать</Link></Button></div>
    <div className="overflow-hidden rounded-lg border bg-card"><Table>
      <TableHeader><TableRow className="bg-muted/40"><TableHead className="pl-4">Название</TableHead><TableHead>Тип</TableHead><TableHead>Технология</TableHead><TableHead className="text-right">Площадь, м²</TableHead><TableHead className="text-right">Этажи</TableHead><TableHead className="text-right">Спальни</TableHead><TableHead className="text-right">Цена, ₽</TableHead><TableHead className="w-12"><span className="sr-only">Открыть на сайте</span></TableHead></TableRow></TableHeader>
      <TableBody>{visible.map(project => <TableRow key={project.id}>
        <TableCell className="h-11 pl-4"><Link className="block font-medium underline-offset-4 hover:underline" href={`/collections/projects/${project.id}`}>{project.name}</Link></TableCell>
        <TableCell><Badge variant="outline">{project.recordType === 'ready-home' ? 'Готовый дом' : 'Проект дома'}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{project.technologyBadge === 'Модульный' ? 'Модульная' : 'Панельно-каркасная'}</TableCell><TableCell className="text-right tabular-nums">{project.areaValue.toLocaleString('ru-RU')}</TableCell><TableCell className="text-right tabular-nums">{project.floorsValue}</TableCell><TableCell className="text-right tabular-nums">{project.bedrooms ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.recordType !== 'ready-home' && project.priceAmount != null ? 'от ' : ''}{(project.recordType === 'ready-home' ? project.readyHome?.salePrice : project.priceAmount)?.toLocaleString('ru-RU') ?? '—'}</TableCell>
        <TableCell className="pr-4"><Button variant="ghost" size="icon" className="size-8" asChild><a href={`${siteUrl}/catalog/${project.slug}`} target="_blank" rel="noreferrer" aria-label={`Открыть на сайте: ${project.name}`}><IconExternalLink className="size-4" /></a></Button></TableCell>
      </TableRow>)}{visible.length === 0 && <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody>
    </Table></div>
    <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{filtered.length ? `${currentPage * 20 + 1}–${Math.min((currentPage + 1) * 20, filtered.length)} из ${filtered.length}` : '0 из 0'}</span><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Предыдущая страница" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><IconChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Следующая страница" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><IconChevronRight className="size-4" /></Button></div></div>
  </>
}
