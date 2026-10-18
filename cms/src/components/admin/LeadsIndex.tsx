'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconSearch } from '@tabler/icons-react'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

const statusLabel = { pending: 'Передача', test: 'Тест', sent: 'Передано', failed: 'Ошибка' }

export type LeadRow = { id: number; title: string; name: string; phone: string; formId: string; status: string; createdAt: string }

function when(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(date)
}

export function LeadsIndex({ rows }: { rows: LeadRow[] }) {
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = rows.filter(row => `${row.title} ${row.name} ${row.phone} ${row.formId}`.toLocaleLowerCase('ru').includes(query))
  const table = useDataPage(filtered)
  return <>
    <div className="relative max-w-lg">
      <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label="Поиск заявок" placeholder="Поиск по названию, имени или телефону" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} />
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="pl-4">Название</TableHead>
          <TableHead>Клиент</TableHead>
          <TableHead>Состояние</TableHead>
          <TableHead>Создано</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {table.rows.map(row => <TableRow key={row.id}>
            <TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/lead-submissions/${row.id}`}>{row.title}</Link></TableCell>
            <TableCell className="text-muted-foreground">{[row.name, row.phone].filter(Boolean).join(' · ')}</TableCell>
            <TableCell><Badge variant={row.status === 'failed' ? 'destructive' : row.status === 'sent' ? 'default' : 'outline'}>{statusLabel[row.status as keyof typeof statusLabel] || row.status}</Badge></TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{when(row.createdAt)}</TableCell>
          </TableRow>)}
          {table.rows.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Заявок нет</TableCell></TableRow>}
        </TableBody>
      </Table>
    </DataTableFrame>
  </>
}
