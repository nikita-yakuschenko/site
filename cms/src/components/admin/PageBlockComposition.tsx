'use client'
import { useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import type { UIFieldClientProps } from 'payload'
import { Button } from '../ui/button'
import { IconComponents } from '@tabler/icons-react'

export function PageBlockComposition({ path }: UIFieldClientProps) {
  const parent = (path || '').replace(/\.composition$/, '')
  const component = useFormFields(([fields]) => fields[`${parent}.component`]?.value) as { relationTo: string; value: string | { id: string } } | undefined
  const id = typeof component?.value === 'object' ? component.value.id : component?.value
  const recordKey = `${component?.relationTo}:${id}`
  const [record, setRecord] = useState<{ recordKey: string; parts: { key: string; title: string }[] }>()
  useEffect(() => {
    if (!id || !['blocks', 'forms'].includes(component?.relationTo || '')) return
    const controller = new AbortController()
    fetch(`/api/${component?.relationTo}/${id}?depth=0`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data) setRecord({ recordKey, parts: data.parts || [] }) }).catch(() => {})
    return () => controller.abort()
  }, [id, component?.relationTo, recordKey])
  if (record?.recordKey !== recordKey || !record.parts.length) return null
  return <div className="shadcn-surface mb-4"><p className="mb-2 text-sm font-medium">Состав</p><div className="flex flex-col gap-1">{record.parts.map(part => <Button key={part.key} type="button" variant="ghost" className="justify-start" onClick={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: parent, key: part.key, title: part.title } }))}><IconComponents className="size-4 text-muted-foreground" />{part.title}</Button>)}</div></div>
}
