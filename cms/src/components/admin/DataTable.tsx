'use client'

import { useId, useState, type ReactNode } from 'react'
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

const pageSizes = [10, 20, 30, 40, 50]

export function useDataPage<T>(rows: T[]) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
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
