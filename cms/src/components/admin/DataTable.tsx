'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconPlus, IconArrowsSort, IconArrowUp, IconArrowDown, IconSearch } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { TableHead } from '../ui/table'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { rememberTableQuery, savedTableQuery } from './catalog-query'

export function useDataTableQuery(storageKey: string, query: string, restore: (params: URLSearchParams) => void) {
  const restored = useRef('')
  useLayoutEffect(() => {
    if (window.location.search.replace(/^\?/, '')) return
    const saved = savedTableQuery(storageKey)
    if (!saved) return
    restored.current = saved
    const frame = window.requestAnimationFrame(() => {
      restore(new URLSearchParams(saved))
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${saved}${window.location.hash}`)
    })
    return () => window.cancelAnimationFrame(frame)
    // Restore only on mount, just as the catalogue does; setters are captured from that mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (restored.current && query !== restored.current) return
    restored.current = ''
    rememberTableQuery(storageKey, query)
    if (query === window.location.search.replace(/^\?/, '')) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  }, [storageKey, query])
}

export function DataTableSearch({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="relative w-full max-w-lg"><IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={label} placeholder={label} className="pl-9" value={value} onChange={event => onChange(event.target.value)} /></div>
}

export function DataTableFacetFilter<T extends string | number>({ title, options, selected, onChange }: { title: string; options: { value: T; label: string }[]; selected: T[]; onChange: (next: T[]) => void }) {
  if (options.length < 2) return null
  const picked = options.filter(option => selected.includes(option.value))
  return <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button type="button" variant="outline" size="sm" className="h-8 border-dashed"><IconPlus />{title}{picked.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">{picked.length > 2 ? picked.length : picked.map(option => option.label).join(', ')}</Badge>}</Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56">{options.map(option => <DropdownMenuCheckboxItem key={String(option.value)} checked={selected.includes(option.value)} onSelect={event => event.preventDefault()} onCheckedChange={checked => onChange(checked ? [...selected, option.value] : selected.filter(item => item !== option.value))}>{option.label}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
}

export function DataTableSortHead({ label, direction, onSort, align = 'left', className = '' }: { label: string; direction?: 'asc' | 'desc'; onSort: (direction: 'asc' | 'desc') => void; align?: 'left' | 'right'; className?: string }) {
  const Icon = direction ? direction === 'asc' ? IconArrowUp : IconArrowDown : IconArrowsSort
  const next = direction === 'asc' ? 'desc' : 'asc'
  return <TableHead className={`${align === 'right' ? 'text-right' : ''} ${className}`} aria-sort={direction ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" className={`inline-flex w-full cursor-pointer items-center gap-1 whitespace-nowrap bg-transparent p-0 text-inherit hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${align === 'right' ? 'justify-end' : 'justify-start'}`} aria-label={`${label}: сортировать ${next === 'asc' ? 'по возрастанию' : 'по убыванию'}`} onClick={() => onSort(next)}>{label}<Icon className="size-3 shrink-0" aria-hidden="true" /></button></TableHead>
}

const pageSizes = [10, 15, 20, 30, 40, 50]

export function useDataPage<T>(rows: T[], initial?: { page?: number; pageSize?: number }) {
  const [pageIndex, setPageIndex] = useState(Math.max(0, initial?.page ?? 0))
  const [pageSize, setPageSize] = useState(initial?.pageSize && pageSizes.includes(initial.pageSize) ? initial.pageSize : 10)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(pageIndex, pageCount - 1)
  const start = page * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageCount,
    pageSize,
    setPage: setPageIndex,
    setPageSize: (size: number) => { setPageSize(size); setPageIndex(0) },
  }
}

// Рамка и нижняя панель как у таблицы в документации shadcn: без выбора строк и без чужих кнопок.
export function DataTableFrame({ page, pageCount, pageSize, onPage, onPageSize, children }: {
  page: number
  pageCount: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
  children: ReactNode
}) {
  const pageSizeId = useId()
  return <div className="flex flex-col gap-4">
    <div className="overflow-hidden rounded-lg border bg-card [&_thead_tr]:hover:bg-transparent [&_th]:text-muted-foreground">{children}</div>
    <div className="flex items-center justify-end px-1">
      <div className="flex w-full items-center gap-6 lg:w-fit lg:gap-8">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor={pageSizeId}>Строк на странице</Label>
          <Select value={String(pageSize)} onValueChange={value => onPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-20" id={pageSizeId}><SelectValue /></SelectTrigger>
            <SelectContent side="top">{pageSizes.map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="text-sm font-medium">Страница {page + 1} из {pageCount}</div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button type="button" variant="outline" size="icon" className="hidden size-8 lg:inline-flex" aria-label="Первая страница" disabled={page === 0} onClick={() => onPage(0)}><IconChevronsLeft /></Button>
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Предыдущая страница" disabled={page === 0} onClick={() => onPage(page - 1)}><IconChevronLeft /></Button>
          <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Следующая страница" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}><IconChevronRight /></Button>
          <Button type="button" variant="outline" size="icon" className="hidden size-8 lg:inline-flex" aria-label="Последняя страница" disabled={page >= pageCount - 1} onClick={() => onPage(pageCount - 1)}><IconChevronsRight /></Button>
        </div>
      </div>
    </div>
  </div>
}
