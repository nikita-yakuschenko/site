'use client'

import Link from 'next/link'
import { priceKindsInForm, type PriceKind } from '../../config/price-kinds'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

export type PriceCell = { price: number; updatedAt: string }
export type PriceTableRow = { id: number; code: string | null; name: string; prices: Partial<Record<PriceKind, PriceCell>> }

const updatedOn = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' })

export function PricesTable({ rows }: { rows: PriceTableRow[] }) {
  const table = useDataPage(rows)
  return <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}>
    <Table>
      <colgroup><col className="w-[12%]" /><col className="w-[18%]" />{priceKindsInForm.map(kind => <col key={kind.value} className="w-[14%]" />)}</colgroup>
      <TableHeader><TableRow>
        <TableHead className="pl-4">Код проекта</TableHead>
        <TableHead>Название проекта</TableHead>
        {priceKindsInForm.map(kind => <TableHead key={kind.value} className="text-right">{kind.label}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>
        {table.rows.map(row => <TableRow key={row.id}>
          <TableCell className="pl-4 font-medium tabular-nums">{row.code || '—'}</TableCell>
          <TableCell><Link className="underline-offset-4 hover:underline" href={`/collections/projects/${row.id}`}>{row.name || '[Без названия]'}</Link></TableCell>
          {priceKindsInForm.map(kind => {
            const cell = row.prices[kind.value]
            return <TableCell key={kind.value} className="text-right">{cell ? <><div className="tabular-nums">{cell.price.toLocaleString('ru-RU')}</div><div className="text-xs text-muted-foreground">{updatedOn.format(new Date(cell.updatedAt))}</div></> : '—'}</TableCell>
          })}
        </TableRow>)}
        {table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={2 + priceKindsInForm.length} className="h-24 text-center text-muted-foreground">Проектов нет</TableCell></TableRow>}
      </TableBody>
    </Table>
  </DataTableFrame>
}
