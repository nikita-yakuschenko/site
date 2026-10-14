'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Page } from '../../payload-types'
import { IconExternalLink, IconSearch, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ChoiceSelect } from './ChoiceSelect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

const kinds: Record<string, string> = { page: 'Страница', template: 'Шаблон', exposition: 'Выставочная площадка', redirect: 'Переадресация', preview: 'Предпросмотр' }
const pageSize = 20

export function PagesIndex({ siteUrl, pages }: { siteUrl: string; pages: Page[] }) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [page, setPage] = useState(0)
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = pages.filter(item => (kind === 'all' || item.kind === kind) && `${item.title} ${item.route}`.toLocaleLowerCase('ru').includes(query))
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1)
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  return <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-lg flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Поиск страниц" placeholder="Поиск по названию или адресу" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      </div>
      <ChoiceSelect label="Тип страницы" className="w-full sm:w-56" value={kind} options={{ all: 'Все типы', ...kinds }} onChange={value => { setKind(value); setPage(0) }} />
      <Button asChild className="sm:ml-auto"><Link href="/collections/pages/create">Создать</Link></Button>
    </div>
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead className="pl-4">Название</TableHead><TableHead>Адрес</TableHead><TableHead>Тип</TableHead><TableHead className="w-12"><span className="sr-only">Открыть</span></TableHead></TableRow></TableHeader>
        <TableBody>
          {visible.map(item => <TableRow key={item.route}>
            <TableCell className="h-12 max-w-md pl-4 whitespace-normal">
              <Link className="block py-1 font-medium underline-offset-4 hover:underline" href={`/collections/pages/${item.id}`}>{item.title}</Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.route}</TableCell>
            <TableCell><Badge variant="outline">{kinds[item.kind]}</Badge></TableCell>
            <TableCell className="pr-4">{item.kind !== 'template' && <Button variant="ghost" size="icon" asChild><a href={`${siteUrl}${item.route}`} target="_blank" rel="noreferrer" aria-label={`Открыть: ${item.title}`}><IconExternalLink className="size-4" /></a></Button>}</TableCell>
          </TableRow>)}
          {visible.length === 0 && <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Страницы не найдены</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{filtered.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} из ${filtered.length}` : '0 из 0'}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Предыдущая страница" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><IconChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="icon" aria-label="Следующая страница" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}><IconChevronRight className="size-4" /></Button>
      </div>
    </div>
  </>
}
