'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import type { SelectFieldClientProps, TextFieldClientProps } from 'payload'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { IconInfoCircle } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu'

const kinds = { page: 'Страница', template: 'Шаблон', exposition: 'Выставочная площадка', redirect: 'Переадресация', preview: 'Предпросмотр' }

export function PageKindField({ path }: SelectFieldClientProps) {
  const { value, setValue } = useField<string>({ path: path || 'kind' })
  return <div className="shadcn-surface"><Select value={value || 'page'} onValueChange={setValue}><SelectTrigger aria-label="Тип страницы"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(kinds).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
}

export function PageRecordMetadata() {
  const { id, data } = useDocumentInfo()
  if (!id) return null
  const value = typeof data?.kind === 'string' ? data.kind : 'page'
  return <div className="shadcn-surface page-record-metadata">
    <Badge variant="outline">{kinds[value as keyof typeof kinds] || value}</Badge>
    {typeof data?.source === 'string' && <span className="min-w-0 break-all text-xs text-muted-foreground">{data.source}</span>}
    <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" aria-label="Сведения о записи" title="Сведения о записи"><IconInfoCircle className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="shadcn-surface w-72"><DropdownMenuLabel>Сведения о записи</DropdownMenuLabel><dl className="space-y-3 px-2 py-2 text-sm">{[['Последнее изменение', data?.updatedAt], ['Создано', data?.createdAt]].map(([label, date]) => typeof date === 'string' && <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 tabular-nums">{new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' }).format(new Date(date))}</dd></div>)}</dl></DropdownMenuContent></DropdownMenu>
  </div>
}

export function PageSourceField({ path }: TextFieldClientProps) {
  const { value } = useField<string>({ path: path || 'source' })
  if (!value) return null
  return <div className="shadcn-surface page-metadata-field"><span className="page-metadata-field__label">Исходный файл</span><span className="break-all text-xs text-muted-foreground">{value}</span></div>
}
