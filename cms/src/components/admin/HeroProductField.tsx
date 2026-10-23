'use client'

import { useField } from '@payloadcms/ui'
import type { NumberFieldClientProps } from 'payload'
import { ChoiceSelect } from './ChoiceSelect'

const options = { none: 'Не закреплять', '1': 'Слот №1', '2': 'Слот №2' }

export function HeroProductField({ path, readOnly }: NumberFieldClientProps) {
  const field = useField<number | null>({ path: path || 'hero_product' })
  return <div className="shadcn-surface space-y-2">
    <div className="text-sm font-medium">Закрепление в каталоге</div>
    {readOnly ? <p className="text-sm">{options[String(field.value || 'none') as keyof typeof options]}</p>
      : <ChoiceSelect label="Закрепление в каталоге" className="w-full" value={String(field.value || 'none')} options={options} onChange={value => field.setValue(value === 'none' ? null : Number(value))} />}
    <p className="text-sm text-muted-foreground">Два слота для проектов-локомотивов в начале каталога. Каждый слот может занимать только один проект.</p>
    {field.showError && <p role="alert" className="text-sm text-destructive">{field.errorMessage}</p>}
  </div>
}
