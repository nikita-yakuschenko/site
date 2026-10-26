'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { leadTypeLabels, leadTypes, type LeadClassification } from '../../config/lead-classification'

export function LeadTypeSelect({ id, classification, editable = true, onSaved }: { id: number; classification: LeadClassification; editable?: boolean; onSaved?: (next: LeadClassification) => void }) {
  const [current, setCurrent] = useState(classification)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save(type: string) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/lead-submissions/${id}/classify`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      if (!response.ok) throw new Error('Не удалось сохранить тип. Повторите попытку.')
      const next = await response.json() as LeadClassification
      setCurrent(next)
      onSaved?.(next)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось сохранить тип') }
    finally { setSaving(false) }
  }
  return <div className="flex flex-col gap-1" title={current.typeReason}>
    <Select value={current.typeSource === 'auto' ? 'auto' : current.leadType} onValueChange={value => { void save(value) }} disabled={!editable || saving}>
      <SelectTrigger size="sm" className="min-w-32" aria-label={`Тип заявки ${id}`}><SelectValue>{leadTypeLabels[current.leadType]}</SelectValue></SelectTrigger>
      <SelectContent>
        {leadTypes.map(type => <SelectItem key={type} value={type}>{leadTypeLabels[type]}</SelectItem>)}
        <SelectItem value="auto">Определять автоматически</SelectItem>
      </SelectContent>
    </Select>
    <span className="text-xs text-muted-foreground" aria-live="polite">{saving ? 'Сохранение…' : current.typeSource === 'manual' ? 'Вручную' : 'Автоматически'}</span>
    {error && <span role="alert" className="max-w-56 text-xs text-destructive">{error}</span>}
  </div>
}
