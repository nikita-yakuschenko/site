'use client'

import { useDocumentInfo, useForm, useFormFields, useFormModified } from '@payloadcms/ui'
import { IconArrowBackUp } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

const ignored = new Set(['id', 'createdAt', 'updatedAt', '_status'])

// Drops empty values and expands relations to IDs so form and saved data compare equally
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) { const items = value.map(normalize).filter(item => item !== undefined); return items.length ? items : undefined }
  if (value && typeof value === 'object') {
    if ('id' in value && 'filename' in value) return (value as { id: unknown }).id
    const entries = Object.entries(value).filter(([key]) => !ignored.has(key)).map(([key, item]) => [key, normalize(item)] as const).filter(([, item]) => item !== undefined)
    return entries.length ? Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) : undefined
  }
  // Form state keeps empty arrays as a zero row count
  return value === null || value === '' || value === 0 ? undefined : value
}

// Paths of the deepest values that differ, like plans.0.floors.0.photo
function diffPaths(a: unknown, b: unknown, path: string[] = []): string[][] {
  if (JSON.stringify(a) === JSON.stringify(b)) return []
  const isObject = (value: unknown) => value !== null && typeof value === 'object'
  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b)) return [path]
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap(key => diffPaths(left[key], right[key], [...path, key]))
}

// Closest rendered field for the path, trimming segments until one exists
function fieldOf(path: string[]) {
  for (let size = path.length; size > 0; size--) {
    const id = path.slice(0, size).join('__')
    const element = document.querySelector(`[id="field-${id}"], [id^="field-${id}__"]`)
    if (element) return element
  }
  return null
}

// Headers of the section and every nested block around the field
function headersOf(field: Element) {
  const headers: Element[] = []
  for (let block = field.closest('.collapsible-field, .array-field__row'); block; block = block.parentElement?.closest('.collapsible-field, .array-field__row') ?? null) {
    const header = block.querySelector('.collapsible__toggle-wrap')
    if (header) headers.push(header)
  }
  return headers
}

// Counts project sections that differ from the published version and offers a reset
export function UnpublishedChanges() {
  const { id, hasPublishedDoc } = useDocumentInfo()
  const { getData } = useForm()
  const modified = useFormModified()
  const fields = useFormFields(([state]) => state)
  const [published, setPublished] = useState<Record<string, unknown> | null>(null)
  const [count, setCount] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  // Refetch after every save or publish
  useEffect(() => {
    if (!id || !hasPublishedDoc || modified) return
    const controller = new AbortController()
    fetch(`/api/projects/${id}?depth=0`, { credentials: 'include', signal: controller.signal }).then(response => response.ok ? response.json() : null).then(setPublished).catch(() => {})
    return () => controller.abort()
  }, [id, hasPublishedDoc, modified])

  // Nested blocks mount only when expanded, so re-mark after DOM changes
  const [domVersion, setDomVersion] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver(() => setDomVersion(version => version + 1))
    const root = document.querySelector('.document-fields__main')
    if (root) observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!published) return
    const timer = setTimeout(() => {
      const current = getData() as Record<string, unknown>
      const changed = [...new Set([...Object.keys(current), ...Object.keys(published)])].filter(key => !ignored.has(key) && JSON.stringify(normalize(current[key])) !== JSON.stringify(normalize(published[key])))
      const fieldsChanged = changed.flatMap(key => diffPaths(normalize(current[key]), normalize(published[key]), [key])).map(fieldOf)
      const sectionHeaders = changed.map(key => document.querySelector(`[data-section-fields~="${key}"]`)?.closest('.collapsible__toggle-wrap'))
      document.querySelectorAll('[data-unpublished]').forEach(element => element.removeAttribute('data-unpublished'))
      ;[...sectionHeaders, ...fieldsChanged.flatMap(field => field ? headersOf(field) : [])].forEach(header => header?.setAttribute('data-unpublished', ''))
      const sections = new Set(sectionHeaders.map(header => header ?? 'other'))
      setCount(sections.size)
    }, 300)
    return () => clearTimeout(timer)
  }, [published, fields, getData, domVersion])
  useEffect(() => () => document.querySelectorAll('[data-unpublished]').forEach(element => element.removeAttribute('data-unpublished')), [])

  // Republishing the published data discards every pending draft change
  const reset = async () => {
    if (!published) return
    setBusy(true)
    const response = await fetch(`/api/projects/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...published, _status: 'published' }) }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return void toast.error('Не удалось отменить изменения')
    window.location.reload()
  }

  if (!hasPublishedDoc || !count) return null
  return <div className="project-unpublished">
    <Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-primary" />Не опубликовано: {count}</Badge>
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Отменить неопубликованные изменения" title="Отменить неопубликованные изменения" onClick={() => setConfirming(true)}><IconArrowBackUp /></Button>
    <Dialog open={confirming} onOpenChange={open => { if (!busy) setConfirming(open) }}>
      <DialogContent className="shadcn-surface">
        <DialogHeader>
          <DialogTitle>Отменить неопубликованные изменения?</DialogTitle>
          <DialogDescription>Проект вернётся к версии, которая сейчас на сайте. Все сохранённые и несохранённые правки после публикации пропадут.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={busy}>Оставить</Button></DialogClose>
          <Button variant="destructive" disabled={busy} onClick={reset}>{busy ? 'Отмена…' : 'Отменить изменения'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}