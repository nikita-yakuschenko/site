'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, DataTableSearch, useDataPage, useDataTableQuery } from './DataTable'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { isLeadType, leadTypeLabels, type LeadClassification, type LeadType } from '../../config/lead-classification'

const statusLabel = { pending: 'Передача', test: 'Тест', sent: 'Передано', failed: 'Ошибка' }

export type LeadRow = LeadClassification & { id: number; title: string; name: string; phone: string; formId: string; status: string; createdAt: string }

function when(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(date)
}

export function LeadsIndex({ rows }: { rows: LeadRow[] }) {
  const initial = useSearchParams()
  const [tab, setTab] = useState<LeadType>(() => { const value = initial.get('tab'); return isLeadType(value) ? value : 'work' })
  const [search, setSearch] = useState(initial.get('q') ?? '')
  const [rulesOpen, setRulesOpen] = useState(false)
  const query = search.trim().toLocaleLowerCase('ru')
  const matching = rows.filter(row => `${row.title} ${row.name} ${row.phone} ${row.formId}`.toLocaleLowerCase('ru').includes(query))
  const filtered = matching.filter(row => row.leadType === tab)
  const table = useDataPage(filtered, { page: Math.max(0, (Number(initial.get('page')) || 1) - 1), pageSize: Number(initial.get('size')) || 10 })
  const params = new URLSearchParams()
  if (tab !== 'work') params.set('tab', tab)
  if (search.trim()) params.set('q', search.trim())
  if (table.page > 0) params.set('page', String(table.page + 1))
  if (table.pageSize !== 10) params.set('size', String(table.pageSize))
  useDataTableQuery('avgst-leads-query', params.toString(), saved => {
    const type = saved.get('tab')
    setTab(isLeadType(type) ? type : 'work')
    setSearch(saved.get('q') ?? '')
    const size = Number(saved.get('size'))
    if ([15, 20, 30, 40, 50].includes(size)) table.setPageSize(size)
    table.setPage(Math.max(0, (Number(saved.get('page')) || 1) - 1))
  })
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} onValueChange={value => { setTab(value as LeadType); table.setPage(0) }}>
        <TabsList aria-label="Типы заявок">
          {(['work', 'test', 'spam'] as const).map(type => <TabsTrigger key={type} value={type}>{({ work: 'Рабочие', test: 'Тестовые', spam: 'Спам' })[type]} <Badge variant="secondary">{rows.filter(row => row.leadType === type).length}</Badge></TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="flex flex-1 items-center justify-end gap-3">
        <DataTableSearch label="Поиск заявок" value={search} onChange={value => { setSearch(value); table.setPage(0) }} />
        <Button type="button" variant="outline" onClick={() => setRulesOpen(true)}>Правила</Button>
      </div>
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
            <TableCell><Badge variant="outline" title={`${row.typeSource === 'manual' ? 'Вручную' : 'Автоматически'}: ${row.typeReason}`}>{leadTypeLabels[row.leadType]}</Badge></TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{when(row.createdAt)}</TableCell>
          </TableRow>)}
          {table.rows.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Заявок нет</TableCell></TableRow>}
        </TableBody>
      </Table>
    </DataTableFrame>
    <Dialog open={rulesOpen} onOpenChange={setRulesOpen}><DialogContent className="shadcn-surface"><DialogHeader><DialogTitle>Как определяется тип заявки</DialogTitle><DialogDescription>Ручной выбор имеет приоритет над автоматическим распознаванием.</DialogDescription></DialogHeader><div className="flex flex-col gap-3 text-sm"><p><strong>Тестовая:</strong> явная тестовая пометка в имени или сообщении, телефон-заглушка либо зарезервированный тестовый email.</p><p><strong>Спам:</strong> три и более внешних ссылок или типовое предложение массовой рекламы. Ссылки на avgst.ru не учитываются.</p><p><strong>Рабочая:</strong> остальные обращения, включая сомнительные случаи.</p><p className="text-muted-foreground">Вернуть распознавание можно пунктом «Определять автоматически» в списке типов. Тип служит для сортировки и сам по себе не отменяет передачу заявки в CRM.</p></div></DialogContent></Dialog>
  </>
}
