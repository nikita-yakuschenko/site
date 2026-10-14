'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import { Input } from '../ui/input'
import type { SelectFieldClientProps, TextFieldClientProps } from 'payload'
import { Badge } from '../ui/badge'
import { ChoiceSelect } from './ChoiceSelect'
import { DraftLeavePrompt } from './DraftLeavePrompt'
import { UnpublishedChanges } from './UnpublishedChanges'
import { IconInfoCircle, IconPencil } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/button'
import { projectSlugFromName } from '../../config/project-slug'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu'

const kinds = { page: 'Страница', template: 'Шаблон', exposition: 'Выставочная площадка', redirect: 'Переадресация', preview: 'Предпросмотр' }

export function PageKindField({ path }: SelectFieldClientProps) {
  const { value, setValue } = useField<string>({ path: path || 'kind' })
  return <div className="shadcn-surface"><ChoiceSelect label="Тип страницы" value={value || 'page'} options={kinds} onChange={setValue} /></div>
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

const recordTypes = { project: 'Проект дома', 'ready-home': 'Готовый дом' }

// Name, type, address and publication status in the single document controls row
export function ProjectRecordMetadata() {
  const { id, hasPublishedDoc } = useDocumentInfo()
  const name = useField<string>({ path: 'name' })
  const recordType = useField<string>({ path: 'recordType' })
  const slug = useField<string>({ path: 'slug' })
  const [editingSlug, setEditingSlug] = useState(false)
  const slugInput = useRef<HTMLInputElement>(null)
  // Focus the address input once edit mode enables it
  useEffect(() => { if (editingSlug) slugInput.current?.focus() }, [editingSlug])
  return <div className="shadcn-surface page-record-metadata project-record-metadata">
    {!id && <DraftLeavePrompt />}
    <label className="project-record-name-wrap" aria-invalid={name.showError || undefined}>
    <Input className="project-record-name" autoFocus={!id} placeholder="Введите название проекта" aria-label="Название" aria-invalid={name.showError || undefined} title={name.showError ? name.errorMessage : undefined} value={name.value || ''} onChange={event => {
      // Address follows the name until it is edited manually
      if (!slug.value || slug.value === projectSlugFromName(name.value || '')) slug.setValue(projectSlugFromName(event.target.value))
      name.setValue(event.target.value)
    }} />
    <Badge variant={hasPublishedDoc ? 'default' : 'outline'}>{hasPublishedDoc ? 'Опубликован' : 'Черновик'}</Badge>
    </label>
    <ChoiceSelect label="Тип записи" className="project-record-type" value={recordType.value || 'project'} options={recordTypes} onChange={recordType.setValue} />
    <div className="project-record-slug">
      <Input ref={slugInput} placeholder="Адрес" aria-label="Адрес" disabled={!editingSlug} aria-invalid={slug.showError || undefined} title={slug.showError ? slug.errorMessage : undefined} value={slug.value || ''} onChange={event => slug.setValue(event.target.value)} onBlur={() => setEditingSlug(false)} onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), setEditingSlug(false))} />
      {!editingSlug && <Button type="button" variant="ghost" size="icon-sm" aria-label="Редактировать адрес" title="Редактировать адрес" onClick={() => setEditingSlug(true)}><IconPencil /></Button>}
    </div>
    <UnpublishedChanges />
  </div>
}

export function PageSourceField({ path }: TextFieldClientProps) {
  const { value } = useField<string>({ path: path || 'source' })
  if (!value) return null
  return <div className="shadcn-surface page-metadata-field"><span className="page-metadata-field__label">Исходный файл</span><span className="break-all text-xs text-muted-foreground">{value}</span></div>
}
