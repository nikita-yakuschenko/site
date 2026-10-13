'use client'
import { useField } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import type { NextStepsSettings } from '../../config/next-steps-settings'

export function ProjectNextStepsContent({ path }: UIFieldClientProps) {
  const base = path.slice(0, path.lastIndexOf('.'))
  const { value: recordType } = useField<string>({ path: 'recordType' })
  const { value: enabled, setValue: setEnabled } = useField<boolean>({ path: base + '.enabled' })
  const visit = useField<boolean>({ path: base + '.visitEnabled' })
  const secondary = useField<boolean>({ path: base + '.secondaryEnabled' })
  const { value: order, setValue: setOrder } = useField<NextStepsSettings['order']>({ path: base + '.order' })
  const cards = [{ key: 'visit', title: 'Посмотрите дом вживую', field: visit }, { key: 'secondary', title: recordType === 'ready-home' ? 'Обзор дома' : 'Консультация с архитектором', field: secondary }]
  if (order === 'secondary-first') cards.reverse()
  const swap = () => setOrder(order === 'secondary-first' ? 'visit-first' : 'secondary-first')
  return <div className="shadcn-surface flex flex-col gap-3">
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={enabled !== false} onCheckedChange={value => setEnabled(value === true)} />Показывать блок</label>
    <p className="text-xs text-muted-foreground">Общий блок. Здесь настраиваются только показ карточек и их порядок.</p>
    {cards.map((card, index) => <div key={card.key} className="flex items-center gap-2 rounded-lg border bg-card p-3">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"><Checkbox checked={card.field.value !== false} disabled={enabled === false} onCheckedChange={value => card.field.setValue(value === true)} />{card.title}</label>
      <Button type="button" variant="ghost" size="icon-sm" disabled={enabled === false || index === 0} aria-label={'Переместить вверх: ' + card.title} onClick={swap}><IconArrowUp /></Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={enabled === false || index === cards.length - 1} aria-label={'Переместить вниз: ' + card.title} onClick={swap}><IconArrowDown /></Button>
    </div>)}
  </div>
}
