'use client'
import { useState } from 'react'
import { ru } from 'date-fns/locale'
import { IconCalendar, IconX } from '@tabler/icons-react'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { wallTimeToISO, zonedParts } from './event-date'

function ClockInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  return <Input id={id} aria-label="Время, ЧЧ:ММ" className="w-24 font-mono" inputMode="numeric" placeholder="ЧЧ:ММ" value={draft} onChange={e => { setDraft(e.target.value); if (/^([01]\d|2[0-3]):[0-5]\d$/.test(e.target.value)) onChange(e.target.value) }} onBlur={() => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft)) setDraft(value) }} onFocus={e => e.target.select()} />
}

export function DateTimePicker({ id, value, onChange, disabled, timeZone = 'Europe/Moscow', invalid = false }: { id: string; value: string; onChange: (value: string) => void; disabled?: boolean; timeZone?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false)
  const p = value ? zonedParts(value, timeZone) : null
  const day = p ? new Date(p.year, p.month - 1, p.day) : undefined
  const time = p ? `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` : '10:00'
  function update(date: Date, clock = time) {
    const [h, m] = clock.split(':').map(Number)
    if (Number.isFinite(h) && Number.isFinite(m)) onChange(wallTimeToISO(date.getFullYear(), date.getMonth() + 1, date.getDate(), h, m, timeZone))
  }
  return <div className="flex min-w-0 items-center gap-1"><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button id={id} type="button" variant="outline" disabled={disabled} aria-invalid={invalid} className="w-full min-w-0 justify-between font-mono font-normal"><span>{p ? `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}.${p.year} ${time}` : 'Выберите дату и время'}</span><IconCalendar className="size-4 shrink-0 text-muted-foreground" /></Button></PopoverTrigger><PopoverContent align="start" className="shadcn-surface w-auto p-0"><Calendar locale={ru} mode="single" selected={day} defaultMonth={day} onSelect={date => { if (date) update(date) }} /><div className="flex items-center justify-between gap-4 border-t p-3"><Label htmlFor={`${id}-time`}>Время · 24 часа</Label><ClockInput key={time} id={`${id}-time`} value={time} onChange={clock => update(day || new Date(), clock)} /><Button type="button" size="sm" variant="secondary" onClick={() => setOpen(false)}>Готово</Button></div><p className="px-3 pb-3 text-xs text-muted-foreground">{timeZone}</p></PopoverContent></Popover>{value && <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label="Очистить дату" onClick={() => onChange('')}><IconX className="size-4" /></Button>}</div>
}
