'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { IconCircleCheckFilled, IconCircleDashed, IconDots, IconPencil, IconUsers } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { DataTableFacetFilter, DataTableFrame, DataTableSearch, DataTableSortHead, useDataPage, useDataTableQuery } from './DataTable'
export type EventRow = { id: number; title: string; slug: string; status?: 'draft' | 'published' | 'completed' | 'cancelled' | null; startsAt: string; timezone?: string | null }
const statuses = { draft: 'Черновик', published: 'Опубликовано', completed: 'Завершено', cancelled: 'Отменено' }
const sorts = ['title', 'startsAt', 'status'] as const
function stateFrom(params: { get: (key: string) => string | null }) {
  return { search: params.get('q') || '', statuses: (params.get('status') || '').split(',').filter(value => value in statuses), sort: sorts.includes(params.get('sort') as typeof sorts[number]) ? params.get('sort') as typeof sorts[number] : 'startsAt' as const, direction: params.get('direction') === 'asc' ? 'asc' as const : 'desc' as const }
}
const byName = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
export function EventsIndex({ events, registrations }: { events: EventRow[]; registrations: Record<string, number> }) {
  const initial = useSearchParams(), [state, setState] = useState(() => stateFrom(initial))
  const q = state.search.trim().toLocaleLowerCase('ru')
  const rows = events.filter(event => (!q || `${event.title} ${event.slug}`.toLocaleLowerCase('ru').includes(q)) && (!state.statuses.length || state.statuses.includes(event.status || 'draft'))).sort((a, b) => (state.direction === 'asc' ? 1 : -1) * byName.compare(String(a[state.sort] || ''), String(b[state.sort] || '')) || a.id - b.id)
  const table = useDataPage(rows, { page: Math.max(0, (Number(initial.get('page')) || 1) - 1), pageSize: Number(initial.get('size')) || undefined })
  const params = new URLSearchParams()
  if (state.search.trim()) params.set('q', state.search.trim())
  if (state.statuses.length) params.set('status', state.statuses.join(','))
  if (state.sort !== 'startsAt' || state.direction !== 'desc') { params.set('sort', state.sort); params.set('direction', state.direction) }
  if (table.page > 0) params.set('page', String(table.page + 1))
  if (table.pageSize !== 10) params.set('size', String(table.pageSize))
  useDataTableQuery('avgst-events-query', params.toString(), saved => { setState(stateFrom(saved)); const size = Number(saved.get('size')); if ([15, 20, 30, 40, 50].includes(size)) table.setPageSize(size); table.setPage(Math.max(0, (Number(saved.get('page')) || 1) - 1)) })
  const tune = (next: Partial<typeof state>) => { setState(old => ({ ...old, ...next })); table.setPage(0) }
  const heading = (key: typeof sorts[number], label: string, className?: string) => <DataTableSortHead label={label} className={className} direction={state.sort === key ? state.direction : undefined} onSort={direction => tune({ sort: key, direction })} />
  return <><div className="flex flex-wrap items-center justify-end gap-3"><DataTableSearch label="Поиск мероприятий" value={state.search} onChange={search => tune({ search })} /><Button asChild><Link href="/collections/events/create">Создать</Link></Button></div><div className="flex flex-wrap gap-2"><DataTableFacetFilter title="Статус" options={Object.entries(statuses).map(([value, label]) => ({ value, label }))} selected={state.statuses} onChange={statuses => tune({ statuses })} />{state.statuses.length > 0 && <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => tune({ statuses: [] })}>Сбросить</Button>}</div><DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table className="min-w-[760px]"><colgroup><col style={{ width: '35%' }} /><col style={{ width: '18%' }} /><col style={{ width: '24%' }} /><col style={{ width: '15%' }} /><col style={{ width: '8%' }} /></colgroup><TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">{heading('title', 'Название', 'pl-4')}{heading('status', 'Статус')}{heading('startsAt', 'Начало')}<TableHead className="text-right">Регистрации</TableHead><TableHead className="pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader><TableBody>{table.rows.map(event => <TableRow key={event.id}><TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/events/${event.id}`}>{event.title}</Link></TableCell><TableCell><Badge variant="outline" className="text-foreground">{event.status === 'published' ? <IconCircleCheckFilled className="text-(--avgst-green)" /> : <IconCircleDashed className="text-muted-foreground" />}{statuses[event.status || 'draft']}</Badge></TableCell><TableCell className="tabular-nums text-muted-foreground">{new Date(event.startsAt).toLocaleString('ru-RU', { timeZone: event.timezone || 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short' })}</TableCell><TableCell className="text-right tabular-nums"><Link className="underline-offset-4 hover:underline" href={`/event-registrations?event=${encodeURIComponent(event.slug)}`}>{registrations[event.slug] || 0}</Link></TableCell><TableCell className="catalog-actions pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 text-muted-foreground data-[state=open]:bg-muted" aria-label={`Действия: ${event.title}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44"><DropdownMenuItem asChild><Link href={`/collections/events/${event.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href={`/event-registrations?event=${encodeURIComponent(event.slug)}`}><IconUsers />Регистрации</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}{!table.rows.length && <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody></Table></DataTableFrame></>
}
