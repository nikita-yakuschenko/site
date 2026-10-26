'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconSearch } from '@tabler/icons-react'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { LeadTypeSelect } from './LeadTypeSelect'
import { type LeadClassification, type LeadType } from '../../config/lead-classification'

const statusLabel = { pending: 'Передача', test: 'Тест', sent: 'Передано', failed: 'Ошибка' }

export type LeadRow = LeadClassification & { id: number; title: string; name: string; phone: string; formId: string; status: string; createdAt: string }

function when(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(date)
}

export function LeadsIndex({ rows: initialRows, editable }: { rows: LeadRow[]; editable: boolean }) {
  const [rows, setRows] = useState(initialRows)
  const [tab, setTab] = useState<LeadType>('work')
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase('ru')
  const matching = rows.filter(row => `${row.title} ${row.name} ${row.phone} ${row.formId}`.toLocaleLowerCase('ru').includes(query))
  const filtered = matching.filter(row => row.leadType === tab)
  const table = useDataPage(filtered)
  return <>
    <Tabs value={tab} onValueChange={value => { setTab(value as LeadType); table.setPage(0) }}>
      <TabsList aria-label="Типы заявок">
        {(['work', 'test', 'spam'] as const).map(type => <TabsTrigger key={type} value={type}>{({ work: 'Рабочие', test: 'Тестовые', spam: 'Спам' })[type]} <span className="ml-1 tabular-nums">{matching.filter(row => row.leadType === type).length}</span></TabsTrigger>)}
      </TabsList>
    <TabsContent value={tab} className="flex flex-col gap-6">
    <details className="text-sm text-muted-foreground"><summary className="w-fit cursor-pointer">Как определяется тип заявки</summary><p className="mt-2 max-w-3xl">Явные тестовые пометки, телефоны-заглушки и тестовые email относятся к тестовым. Три и более ссылок или типовые предложения массовой рекламы — к спаму. Остальные заявки считаются рабочими. Тип можно изменить вручную; автоматическое распознавание не перезаписывает ручной выбор. Тип служит для сортировки и сам по себе не отменяет передачу заявки в CRM.</p></details>
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
          <TableHead>Тип</TableHead>
          <TableHead>Создано</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {table.rows.map(row => <TableRow key={row.id}>
            <TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/lead-submissions/${row.id}`}>{row.title}</Link></TableCell>
            <TableCell className="text-muted-foreground">{[row.name, row.phone].filter(Boolean).join(' · ')}</TableCell>
            <TableCell><Badge variant={row.status === 'failed' ? 'destructive' : row.status === 'sent' ? 'default' : 'outline'}>{statusLabel[row.status as keyof typeof statusLabel] || row.status}</Badge></TableCell>
            <TableCell><LeadTypeSelect id={row.id} classification={row} editable={editable} onSaved={next => { setRows(current => current.map(item => item.id === row.id ? { ...item, ...next } : item)) }} /></TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{when(row.createdAt)}</TableCell>
          </TableRow>)}
          {table.rows.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Заявок нет</TableCell></TableRow>}
        </TableBody>
      </Table>
    </DataTableFrame>
    </TabsContent>
    </Tabs>
  </>
}
