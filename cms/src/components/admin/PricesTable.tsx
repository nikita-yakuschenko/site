'use client'

import { useState } from 'react'
import Link from 'next/link'
import { priceKindsInForm, type PriceKind } from '../../config/price-kinds'
import type { PriceHistoryEntry } from '../../config/price-history'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

export type PriceCell = { price: number; updatedAt: string; history: PriceHistoryEntry[] }
export type PriceTableRow = { id: number; code: string | null; name: string; prices: Partial<Record<PriceKind, PriceCell>> }

const shownDay = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' })

function formatDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : shownDay.format(new Date(value))
}

export function PricesTable({ rows }: { rows: PriceTableRow[] }) {
  const [opened, setOpened] = useState<{ name: string; kind: string; history: PriceHistoryEntry[] } | null>(null)
  return <>
    <div className="overflow-hidden rounded-lg border bg-card"><Table>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
        <TableHead className="pl-4">Код проекта</TableHead>
        <TableHead>Название проекта</TableHead>
        {priceKindsInForm.map(kind => <TableHead key={kind.value} className="text-right">{kind.label}</TableHead>)}
      </TableRow></TableHeader>
      <TableBody>
        {rows.map(row => <TableRow key={row.id}>
          <TableCell className="pl-4 font-medium tabular-nums">{row.code || '—'}</TableCell>
          <TableCell><Link className="underline-offset-4 hover:underline" href={`/collections/projects/${row.id}`}>{row.name || '[Без названия]'}</Link></TableCell>
          {priceKindsInForm.map(kind => {
            const cell = row.prices[kind.value]
            if (!cell) return <TableCell key={kind.value} className="text-right">—</TableCell>
            const history = cell.history.length ? cell.history : [{ date: cell.updatedAt, amount: cell.price }]
            const latest = history.at(-1)!
            return <TableCell key={kind.value} className="text-right"><button type="button" className="ml-auto block text-right" aria-label={`${row.name}: ${kind.label}`} onClick={() => setOpened({ name: row.name || 'Проект', kind: kind.label, history })}><div className="tabular-nums">{latest.amount.toLocaleString('ru-RU')}</div><div className="text-xs text-muted-foreground">{formatDay(latest.date)}</div></button></TableCell>
          })}
        </TableRow>)}
        {rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={2 + priceKindsInForm.length} className="h-32 text-center text-muted-foreground">Проектов нет</TableCell></TableRow>}
      </TableBody>
    </Table></div>
    <Dialog open={!!opened} onOpenChange={open => { if (!open) setOpened(null) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>{opened?.kind}</DialogTitle><DialogDescription>{opened?.name}. Новые суммы добавляются сверху.</DialogDescription></DialogHeader>
      <div className="flex flex-col gap-2">{[...(opened?.history ?? [])].reverse().map(entry => <div key={`${entry.date}:${entry.amount}`} className="flex items-baseline justify-between gap-4 text-sm"><span>{formatDay(entry.date)}</span><span className="tabular-nums">{entry.amount.toLocaleString('ru-RU')} ₽</span></div>)}</div>
    </DialogContent></Dialog>
  </>
}
