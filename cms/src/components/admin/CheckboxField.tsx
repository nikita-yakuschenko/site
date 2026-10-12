'use client'

import { useId } from 'react'
import { useField } from '@payloadcms/ui'
import type { CheckboxFieldClientProps } from 'payload'
import { Checkbox } from '../ui/checkbox'

export function CheckboxField({ path, field, readOnly }: CheckboxFieldClientProps) {
  const id = useId()
  const { value, setValue, showError, errorMessage } = useField<boolean>({ path })
  const label = typeof field.label === 'string' ? field.label : field.label && typeof field.label === 'object' ? field.label.ru : field.name
  return <div className="shadcn-surface field-type checkbox">
    <div className="flex min-h-9 items-center gap-2">
      <Checkbox id={id} checked={value === true} onCheckedChange={checked => setValue(checked === true)} disabled={readOnly} aria-invalid={showError} aria-describedby={showError ? `${id}-error` : undefined} />
      <label htmlFor={id} className="cursor-pointer text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50">{label}</label>
    </div>
    {showError && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">{errorMessage}</p>}
  </div>
}
