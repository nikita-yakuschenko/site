'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { IconCircleCheckFilled, IconCircleDashed, IconDots, IconPencil, IconTrash } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { DataTableFacetFilter, DataTableFrame, DataTableSearch, DataTableSortHead, useDataPage, useDataTableQuery } from './DataTable'
import { participantStatuses, registrationRows, registrationState, type ParticipantRow, type RegistrationSort } from './registration-table'

export function ParticipantsIndex({ rows, flow = 'referral', events = [] }: { rows: ParticipantRow[]; flow?: 'referral' | 'event'; events?: { value: string; label: string }[] }) {
  const initial = useSearchParams(), router = useRouter()
  const [state, setState] = useState(() => registrationState(initial))
  const [removing, setRemoving] = useState<ParticipantRow | null>(null), [busy, setBusy] = useState(false)
  const collection = flow === 'referral' ? 'referral-participants' : 'event-registrations'
  const table = useDataPage(registrationRows(rows, state), { page: Math.max(0, (Number(initial.get('page')) || 1) - 1), pageSize: Number(initial.get('size')) || undefined })
  const params = new URLSearchParams()
  if (state.search.trim()) params.set('q', state.search.trim())
  if (state.statuses.length) params.set('status', state.statuses.join(','))
  if (state.events.length) params.set('event', state.events.join(','))
  if (state.sort) { params.set('sort', state.sort); params.set('direction', state.direction) }
  if (table.page > 0) params.set('page', String(table.page + 1))
  if (table.pageSize !== 10) params.set('size', String(table.pageSize))
  useDataTableQuery(`avgst-${collection}-query`, params.toString(), saved => {
    setState(registrationState(saved))
    const size = Number(saved.get('size'))
    if ([15, 20, 30, 40, 50].includes(size)) table.setPageSize(size)
    table.setPage(Math.max(0, (Number(saved.get('page')) || 1) - 1))
  })
  const tune = (patch: Partial<typeof state>) => { setState(value => ({ ...value, ...patch })); table.setPage(0) }
  const heading = (key: RegistrationSort, label: string, className?: string) => <DataTableSortHead label={label} className={className} direction={state.sort === key ? state.direction : undefined} onSort={direction => tune({ sort: key, direction })} />
  const statuses = flow === 'referral' ? ['active', 'pending', 'blocked'] : ['pending', 'confirmed', 'cancelled', 'attended']
  async function remove() {
    if (!removing) return
    setBusy(true)
    const response = await fetch(`/api/${collection}/${removing.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return void toast.error('Не удалось удалить запись')
    toast.success('Запись удалена'); setRemoving(null); router.refresh()
  }
  return <>
    <div className="flex flex-wrap items-center justify-end gap-3">
      <DataTableSearch label={flow === 'referral' ? 'Поиск участников' : 'Поиск регистраций'} value={state.search} onChange={search => tune({ search })} />
      <Button asChild><Link href={`/collections/${collection}/create`}>Создать</Link></Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <DataTableFacetFilter title="Статус" options={statuses.map(value => ({ value, label: participantStatuses[value as keyof typeof participantStatuses] }))} selected={state.statuses} onChange={statuses => tune({ statuses })} />
      {flow === 'event' && <DataTableFacetFilter title="Мероприятие" options={events} selected={state.events} onChange={events => tune({ events })} />}
      {(state.statuses.length > 0 || state.events.length > 0) && <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => tune({ statuses: [], events: [] })}>Сбросить</Button>}
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table className="min-w-[960px]"><colgroup>{[17, 23, 23, 14, 8, 10, 5].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">{heading('name', 'Участник', 'pl-4')}{heading('status', 'Статус')}{heading('email', 'Email')}<TableHead>Телефон</TableHead>{flow === 'referral' ? heading('code', 'Код') : <TableHead>Мероприятие</TableHead>}{heading('confirmedAt', 'Подтверждение')}<TableHead className="pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{table.rows.map(row => <TableRow key={row.id}>
        <TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/${collection}/${row.id}`}>{row.name}</Link></TableCell>
        <TableCell><Badge variant="outline" className="text-foreground">{['active', 'confirmed', 'attended'].includes(row.status) ? <IconCircleCheckFilled className="text-(--avgst-green)" /> : <IconCircleDashed className="text-muted-foreground" />}{participantStatuses[row.status as keyof typeof participantStatuses] || row.status}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{row.email || '—'}</TableCell><TableCell className="text-muted-foreground">{row.phone || '—'}</TableCell>
        <TableCell className={flow === 'referral' ? 'tabular-nums' : 'text-muted-foreground'}>{flow === 'referral' ? row.code : events.find(e => e.value === row.eventSlug)?.label || row.eventSlug}</TableCell>
        <TableCell className="text-muted-foreground tabular-nums">{row.confirmedAt ? new Date(row.confirmedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' }) : '—'}</TableCell>
        <TableCell className="catalog-actions pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" aria-label={`Действия: ${row.name}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44"><DropdownMenuItem asChild><Link href={`/collections/${collection}/${row.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(row)}><IconTrash />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow>)}{table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody>
    </Table></DataTableFrame>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface"><DialogHeader><DialogTitle>Удалить «{removing?.name}»?</DialogTitle><DialogDescription>Запись будет удалена из CMS. Отменить удаление нельзя.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Отмена</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
