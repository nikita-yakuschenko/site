'use client'
import { useRowLabel, useCollapsible } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { IconForms, IconLayout } from '@tabler/icons-react'
import { Badge } from '../ui/badge'
type Row = { component?: { relationTo: 'blocks' | 'forms'; value: number | { id: number; title?: string } } }
export function PageLayoutRowLabel() {
  const { data, rowNumber, path } = useRowLabel<Row>()
  const { isCollapsed } = useCollapsible()
  const component = data?.component
  const id = typeof component?.value === 'object' ? component.value.id : component?.value
  const suppliedTitle = typeof component?.value === 'object' ? component.value.title : undefined
  const [resolved, setResolved] = useState<{ key: string; title: string; componentKey: string; shared: boolean }>()
  const key = `${component?.relationTo}:${id}`
  useEffect(() => {
    if (!id || !component?.relationTo) return
    const controller = new AbortController()
    fetch(`/api/${component.relationTo}/${encodeURIComponent(id)}?depth=0`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(record => { if (record?.title) setResolved({ key, title: record.title, componentKey: record.key, shared: record.defaults?.shared === true }) })
      .catch(() => {})
    return () => controller.abort()
  }, [id, component?.relationTo, suppliedTitle, key])
  const title = suppliedTitle || (resolved?.key === key ? resolved.title : undefined)
  useEffect(() => {
    if (isCollapsed) {
      window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path, closed: true } }))
    } else if (resolved?.key === key) {
      window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path, key: resolved.componentKey, title: resolved.title } }))
    }
  }, [isCollapsed, resolved, key, path])
  const Icon = component?.relationTo === 'forms' ? IconForms : IconLayout
  return <span className="flex min-w-0 items-center gap-3 text-sm font-medium"><span className="shrink-0 tabular-nums text-muted-foreground">{String((rowNumber ?? 0) + 1).padStart(2, '0')}</span><Icon className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{title || (id ? 'Компонент' : 'Выберите блок или форму')}</span>{resolved?.key === key && resolved.shared && <Badge variant="outline" className="shrink-0" title="Общий блок сайта, используемый на нескольких страницах">Общий</Badge>}</span>
}
