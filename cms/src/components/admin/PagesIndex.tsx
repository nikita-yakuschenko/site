'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Page } from '../../payload-types'
import { IconExternalLink, IconSearch } from '@tabler/icons-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ChoiceSelect } from './ChoiceSelect'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

const kinds: Record<string, string> = { page: 'Страница', template: 'Шаблон', exposition: 'Выставочная площадка', redirect: 'Переадресация', preview: 'Предпросмотр' }

export function PagesIndex({ siteUrl, pages }: { siteUrl: string; pages: Page[] }) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = pages.filter(item => (kind === 'all' || item.kind === kind) && `${item.title} ${item.route}`.toLocaleLowerCase('ru').includes(query))
  const table = useDataPage(filtered)

  return <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-lg flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Поиск страниц" placeholder="Поиск по названию или адресу" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} />
      </div>
      <ChoiceSelect label="Тип страницы" className="w-full sm:w-56" value={kind} options={{ all: 'Все типы', ...kinds }} onChange={value => { setKind(value); table.setPage(0) }} />
      <Button asChild className="sm:ml-auto"><Link href="/collections/pages/create">Создать</Link></Button>
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}>
      <Table>
        <colgroup><col className="w-[34%]" /><col className="w-[42%]" /><col className="w-[18%]" /><col className="w-[6%]" /></colgroup>
        <TableHeader><TableRow><TableHead className="pl-4">Название</TableHead><TableHead>Адрес</TableHead><TableHead>Тип</TableHead><TableHead><span className="sr-only">Открыть</span></TableHead></TableRow></TableHeader>
        <TableBody>
          {table.rows.map(item => <TableRow key={item.route}>
            <TableCell className="h-12 pl-4">
              <Link className="block py-1 font-medium underline-offset-4 hover:underline" href={`/collections/pages/${item.id}`}>{item.title}</Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{item.route}</TableCell>
            <TableCell><Badge variant="outline">{kinds[item.kind]}</Badge></TableCell>
            <TableCell className="pr-4">{item.kind !== 'template' && <Button variant="ghost" size="icon" asChild><a href={`${siteUrl}${item.route}`} target="_blank" rel="noreferrer" aria-label={`Открыть: ${item.title}`}><IconExternalLink className="size-4" /></a></Button>}</TableCell>
          </TableRow>)}
          {table.rows.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Страницы не найдены</TableCell></TableRow>}
        </TableBody>
      </Table>
    </DataTableFrame>
  </>
}
