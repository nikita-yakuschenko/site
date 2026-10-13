'use client'

import { useRef, useState } from 'react'
import { useField, useForm, useFormFields, useFormSubmitted } from '@payloadcms/ui'
import type { ArrayFieldClientProps } from 'payload'
import { IconGripVertical, IconPlus, IconX } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

type Cell = { value?: unknown; valid?: boolean; errorMessage?: string }

// Area is stored as text like «12,9» or «12,9 м²»; the table shows the bare number.
const areaNumber = (value: unknown) => typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) || 0 : 0
const areaText = (value: unknown) => typeof value === 'string' ? value.replace(/\s*м[²2]\s*$/, '') : ''
const cellInput = 'h-8 border-transparent bg-transparent px-2 shadow-none hover:border-input dark:bg-transparent'

export function RoomsTable({ path, schemaPath }: ArrayFieldClientProps) {
  const { rows = [] } = useField({ path })
  const { addFieldRow, dispatchFields, moveFieldRow, removeFieldRow, setModified } = useForm()
  const submitted = useFormSubmitted()
  const cells = useFormFields(([fields]) => rows.map((_, index) => ({
    name: fields[`${path}.${index}.name`] as Cell | undefined,
    area: fields[`${path}.${index}.area`] as Cell | undefined,
  })))
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const dragRef = useRef(drag)
  const remember = (next: typeof drag) => { dragRef.current = next; setDrag(next) }

  const update = (field: string, value: string) => {
    dispatchFields({ type: 'UPDATE', path: field, value })
    setModified(true)
  }
  const total = cells.reduce((sum, cell) => sum + areaNumber(cell.area?.value), 0)
  const add = () => addFieldRow({ path, rowIndex: rows.length, schemaPath: schemaPath || path.replace(/\.\d+(?=\.|$)/g, ''), subFieldState: { name: { initialValue: '', valid: true, value: '' }, area: { initialValue: '', valid: true, value: '' } } })

  return <div className="rooms-table shadcn-surface my-2 flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium">Экспликация</span>
      <span className="text-xs tabular-nums text-muted-foreground">{rows.length} пом. · {total.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м²</span>
    </div>
    <div className="rooms-table__frame overflow-hidden rounded-md">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 w-7 px-0" />
            <TableHead className="h-8 px-2 text-xs text-muted-foreground">Помещение</TableHead>
            <TableHead className="h-8 w-24 px-2 text-right text-xs text-muted-foreground">м²</TableHead>
            <TableHead className="h-8 w-8 px-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const cell = cells[index] || {}
            const nameError = submitted && cell.name?.valid === false
            const areaError = submitted && cell.area?.valid === false
            const over = drag && drag.over === index && drag.from !== index
            return <TableRow key={row.id || index}
              className={[drag?.from === index ? 'is-dragging' : '', over ? (drag!.from < index ? 'is-over-after' : 'is-over-before') : ''].filter(Boolean).join(' ')}
              onDragOver={event => {
                if (!dragRef.current) return
                event.preventDefault()
                if (dragRef.current.over !== index) remember({ ...dragRef.current, over: index })
              }}
              onDrop={event => {
                const current = dragRef.current
                if (!current) return
                event.preventDefault()
                remember(null)
                if (current.from !== index) moveFieldRow({ path, moveFromIndex: current.from, moveToIndex: index })
              }}>
              <TableCell className="w-7 p-0 pl-1">
                <span draggable aria-label={`Перетащить помещение ${index + 1}`} className="flex h-8 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                  onDragStart={event => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', 'room')
                    const line = event.currentTarget.closest('tr')
                    if (line) event.dataTransfer.setDragImage(line, 16, 16)
                    remember({ from: index, over: index })
                  }}
                  onDragEnd={() => remember(null)}><IconGripVertical className="size-4" /></span>
              </TableCell>
              <TableCell className="p-1">
                <Input className={cellInput} aria-label={`Название помещения ${index + 1}`} aria-invalid={nameError || undefined} title={nameError ? cell.name?.errorMessage : undefined}
                  placeholder="Название" value={typeof cell.name?.value === 'string' ? cell.name.value : ''}
                  onChange={event => update(`${path}.${index}.name`, event.target.value)} />
              </TableCell>
              <TableCell className="w-24 p-1">
                <Input className={`${cellInput} text-right tabular-nums`} aria-label={`Площадь помещения ${index + 1}, м²`} aria-invalid={areaError || undefined} title={areaError ? cell.area?.errorMessage : undefined}
                  inputMode="decimal" placeholder="0,0" value={areaText(cell.area?.value)}
                  onChange={event => update(`${path}.${index}.area`, event.target.value.replace('.', ','))} />
              </TableCell>
              <TableCell className="w-8 p-0">
                <Button type="button" variant="ghost" size="icon-xs" className="mx-auto flex text-muted-foreground hover:text-destructive" aria-label={`Удалить помещение ${index + 1}`} onClick={() => removeFieldRow({ path, rowIndex: index })}><IconX className="size-3.5" /></Button>
              </TableCell>
            </TableRow>
          })}
          {!rows.length && <TableRow className="hover:bg-transparent"><TableCell colSpan={4} className="h-12 text-center text-muted-foreground">Помещений пока нет</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
    <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}><IconPlus /> Добавить помещение</Button>
  </div>
}
