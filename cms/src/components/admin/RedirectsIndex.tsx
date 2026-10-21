'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconSearch, IconDots, IconPencil, IconTrash } from '@tabler/icons-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { DataTableFrame, useDataPage } from './DataTable'
import { redirectPath } from '../../../../src/lib/redirect-rules'

type Row = { id: number; source: string; target: string; published: boolean }
type Target = { title: string; path: string }

export function RedirectsIndex({ rows: initial, targets }: { rows: Row[]; targets: Target[] }) {
  const [rows, setRows] = useState(initial)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Partial<Row> | null>(null)
  const [removing, setRemoving] = useState<Row | null>(null)
  const [targetSearch, setTargetSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const query = search.trim().toLocaleLowerCase('ru')
  const targetLabel = (path: string) => targets.find(target => target.path === path)?.title || path
  const filtered = rows.filter(row => `${row.source} ${row.target} ${targetLabel(row.target)}`.toLocaleLowerCase('ru').includes(query)).sort((a, b) => a.source.localeCompare(b.source))
  const table = useDataPage(filtered)
  const matches = targets.filter(target => `${target.title} ${target.path}`.toLocaleLowerCase('ru').includes(targetSearch.trim().toLocaleLowerCase('ru')))
  const open = (row: Partial<Row>) => { setEditing(row); setTargetSearch('') }
  async function save() {
    if (!editing) return
    setBusy(true)
    try {
      const route = redirectPath(editing.source || '', true)
      const target = redirectPath(editing.target || '')
      const response = await fetch(`/api/pages${editing.id ? `/${editing.id}` : ''}`, { method: editing.id ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ route, redirect: target, kind: 'redirect', title: `${route} → ${target}`, metaTitle: 'Переадресация', _status: 'published', ...(!editing.id ? { layout: [] } : {}) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Не удалось сохранить соответствие')
      const doc = data.doc
      setRows(current => [...current.filter(row => row.id !== doc.id), { id: doc.id, source: doc.route, target: doc.redirect, published: true }])
      setEditing(null)
      toast.success('Редирект сохранён. Изменения появятся на сайте в течение 30 секунд.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось сохранить') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!removing) return
    setBusy(true)
    try {
      const response = await fetch(`/api/pages/${removing.id}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok) { const data = await response.json(); throw new Error(data.errors?.[0]?.message || 'Не удалось удалить соответствие') }
      setRows(current => current.filter(row => row.id !== removing.id))
      setRemoving(null)
      toast.success('Редирект удалён. Изменения появятся на сайте в течение 30 секунд.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось удалить') }
    finally { setBusy(false) }
  }
  return <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-lg flex-1"><IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Поиск редиректов" placeholder="Поиск по старому или целевому адресу" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} /></div>
      <Button variant="outline" asChild className="sm:ml-auto"><Link href="/catalog">В каталог</Link></Button>
      <Button onClick={() => open({ source: '', target: '' })}>Создать</Button>
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}>
      <Table><TableHeader><TableRow><TableHead className="pl-4">Исходный адрес</TableHead><TableHead>Целевая страница</TableHead><TableHead>Статус</TableHead><TableHead className="w-16"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
        <TableBody>{table.rows.map(row => <TableRow key={row.id}>
          <TableCell className="h-14 pl-4"><button type="button" className="text-left font-medium underline-offset-4 hover:underline" onClick={() => open(row)}>{row.source}</button></TableCell>
          <TableCell><span className="block font-medium">{targetLabel(row.target)}</span><span className="text-sm text-muted-foreground">{row.target}</span></TableCell>
          <TableCell><Badge variant="outline">{row.published ? '308 · Постоянный' : 'Черновик'}</Badge></TableCell>
          <TableCell className="catalog-actions pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Действия: ${row.source}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface"><DropdownMenuItem onSelect={() => open(row)}><IconPencil />Редактировать</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(row)}><IconTrash />Удалить</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
        </TableRow>)}{!table.rows.length && <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Соответствия не найдены</TableCell></TableRow>}</TableBody>
      </Table>
    </DataTableFrame>
    <Dialog open={!!editing} onOpenChange={value => { if (!value && !busy) setEditing(null) }}><DialogContent className="shadcn-surface sm:max-w-xl"><DialogHeader><DialogTitle>{editing?.id ? 'Редактировать редирект' : 'Создать редирект'}</DialogTitle><DialogDescription>Выберите целевую страницу и укажите адрес, с которого нужно перенаправлять посетителей.</DialogDescription></DialogHeader>
      <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void save() }}>
        <div className="grid gap-2"><Label htmlFor="redirect-target-search">Найти целевую страницу</Label><Input id="redirect-target-search" placeholder="Название проекта или страницы" value={targetSearch} onChange={event => setTargetSearch(event.target.value)} />
          {(targetSearch || !editing?.target) && <div className="max-h-48 overflow-auto rounded-md border">{matches.map((target, index) => <button key={`${target.path}-${index}`} type="button" className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-muted" onClick={() => { setEditing(current => ({ ...current, target: target.path })); setTargetSearch('') }}><span className="text-sm font-medium">{target.title}</span><span className="text-xs text-muted-foreground">{target.path}</span></button>)}{!matches.length && <p className="p-3 text-sm text-muted-foreground">Страницы не найдены</p>}</div>}
        </div>
        <div className="grid gap-2"><Label htmlFor="redirect-target">Целевой адрес</Label><Input id="redirect-target" required value={editing?.target || ''} onChange={event => setEditing(current => ({ ...current, target: event.target.value }))} placeholder="/catalog/sweden-135" /></div>
        <div className="grid gap-2"><Label htmlFor="redirect-source">Исходный адрес</Label><Input id="redirect-source" required value={editing?.source || ''} onChange={event => setEditing(current => ({ ...current, source: event.target.value }))} placeholder="/catalog/swened-135" /><p className="text-sm text-muted-foreground">Путь или ссылка на avgst.ru без меток. Параметры посетителя сохраняются.</p></div>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Отмена</Button><Button type="submit" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
    <Dialog open={!!removing} onOpenChange={value => { if (!value && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface"><DialogHeader><DialogTitle>Удалить редирект?</DialogTitle><DialogDescription>Переадресация с {removing?.source} перестанет работать. Целевая страница останется на сайте.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>Отмена</Button><Button variant="destructive" disabled={busy} onClick={() => void remove()}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
