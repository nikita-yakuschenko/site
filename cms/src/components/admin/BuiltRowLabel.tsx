'use client'

import { useForm, useFormFields, useRowLabel } from '@payloadcms/ui'
import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { Button } from '../ui/button'

export function BuiltRowLabel() {
  const { path, rowNumber } = useRowLabel()
  const type = useFormFields(([fields]) => fields[`${path}.type`]?.value)
  const fields = useFormFields(([fields]) => fields)
  const { dispatchFields, setModified } = useForm()
  const active = fields[`${path}.isPrimary`]?.value === true
  const number = String((rowNumber ?? 0) + 1).padStart(2, '0')
  return <span className="exterior-row-label shadcn-surface">
    <span>{type === 'video' ? 'Видео' : 'Фото'} {number}</span>
    <Button type="button" variant="ghost" size="icon-sm" aria-pressed={active} aria-label={active ? `Основная запись ${number}` : `Назначить основной запись ${number}`} title={active ? 'Основная запись' : 'Сделать основной'} onKeyDown={event => event.stopPropagation()} onClick={event => {
      event.stopPropagation()
      if (active) return
      const root = path.slice(0, path.lastIndexOf('.'))
      const updates: typeof fields = {}
      for (const fieldPath of Object.keys(fields)) {
        if (fieldPath.startsWith(`${root}.`) && fieldPath.endsWith('.isPrimary')) updates[fieldPath] = { ...fields[fieldPath], value: fieldPath === `${path}.isPrimary` }
      }
      dispatchFields({ type: 'UPDATE_MANY', formState: updates })
      setModified(true)
    }}>{active ? <IconStarFilled /> : <IconStar />}</Button>
  </span>
}
