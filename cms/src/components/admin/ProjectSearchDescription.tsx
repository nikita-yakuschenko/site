'use client'
import { useField, useFormFields } from '@payloadcms/ui'
import type { TextareaFieldClientProps } from 'payload'
export function ProjectSearchDescription({ path, readOnly }: TextareaFieldClientProps) {
  const { value, setValue } = useField<string | null>({ path })
  const name = useFormFields(([fields]) => fields.name?.value as string || '')
  return <div className="shadcn-surface flex flex-col gap-2"><label htmlFor="project-search-description" className="text-sm font-medium">Описание для поиска</label><textarea id="project-search-description" className="rounded-lg border bg-transparent p-3 text-sm" disabled={readOnly} value={value ?? name} onChange={event => setValue(event.target.value || null)} /><p className="text-sm text-muted-foreground">По умолчанию — название проекта. Можно заменить своим описанием.</p>{value != null && <button type="button" disabled={readOnly} className="self-start text-sm underline" onClick={() => setValue(null)}>Использовать название проекта</button>}</div>
}
