'use client'
import { useId } from 'react'
import { useField } from '@payloadcms/ui'
import type { SelectFieldClientProps } from 'payload'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
export function AutomationSelectField({ path, field }: SelectFieldClientProps) {
  const id = useId(), { value, setValue, disabled, formProcessing, showError, errorMessage } = useField<string>({ path })
  return <div className="shadcn-surface mb-6 flex flex-col gap-2"><Label htmlFor={id}>{String(field.label || 'Состояние')}</Label><Select value={value || ''} disabled={disabled || formProcessing || field.admin?.readOnly} onValueChange={value => setValue(value)}><SelectTrigger id={id} className="w-full" aria-invalid={showError}><SelectValue /></SelectTrigger><SelectContent>{field.options.map(option => typeof option === 'string' ? <SelectItem key={option} value={option}>{option}</SelectItem> : <SelectItem key={option.value} value={option.value}>{String(option.label)}</SelectItem>)}</SelectContent></Select>{showError && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}</div>
}
