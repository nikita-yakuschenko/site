'use client'
import { useState } from 'react'
import { useField, useRowLabel } from '@payloadcms/ui'
import { IconPencil } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { floorName, variantName } from '../../config/project-plans'

export function PlanVariantRowLabel() {
  const { rowNumber } = useRowLabel()
  return <span>{variantName(rowNumber ?? 0)}</span>
}

export function PlanFloorRowLabel() {
  const { data, rowNumber, path } = useRowLabel<{ label?: string | null }>()
  const label = useField<string | null>({ path: `${path}.label` })
  const [editing, setEditing] = useState(false)
  const index = rowNumber ?? 0
  const stored = typeof label.value === 'string' ? label.value : data?.label
  const shown = floorName(stored, index)
  const save = (value: string) => {
    const trimmed = value.trim()
    label.setValue(trimmed && trimmed !== floorName(null, index) ? trimmed : null)
    setEditing(false)
  }
  if (editing) return <input className="plan-floor-label__input" aria-label="Название этажа" defaultValue={shown} autoFocus onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onBlur={event => save(event.target.value)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); save(event.currentTarget.value) } if (event.key === 'Escape') setEditing(false) }} />
  return <span className="plan-floor-label">
    {shown}
    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Изменить название: ${shown}`} title="Изменить название" onMouseDown={event => event.stopPropagation()} onClick={event => { event.preventDefault(); event.stopPropagation(); setEditing(true) }}><IconPencil /></Button>
  </span>
}
