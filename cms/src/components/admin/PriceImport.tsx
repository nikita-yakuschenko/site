'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mergePriceRows, parsePriceFile, type PriceInput } from '../../config/price-import'
import type { MarketingChoice } from '../../config/marketing-prices'
import { configurationNames } from '../../../../src/lib/catalog/configuration-rules'
import { priceKinds } from '../../config/price-kinds'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { IconUpload } from '@tabler/icons-react'
import { DataTableFrame, useDataPage } from './DataTable'

type PriceReport = { file: string; lines: string[] }
type Preview = { rows: PriceInput[]; choices: MarketingChoice[]; unmatched: string[] }

const accepted = (name: string) => /\.(xlsx|csv|json)$/i.test(name)

async function fileBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  return btoa(binary)
}

export function PriceImport() {
  const router = useRouter()
  const [rows, setRows] = useState<PriceInput[]>([])
  const [reports, setReports] = useState<PriceReport[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const preview = useDataPage(rows)

  async function readMarketing(file: File): Promise<Preview> {
    const response = await fetch('/api/project-prices/preview-marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, file: await fileBase64(file) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    return { rows: result.rows || [], choices: result.choices || [], unmatched: result.unmatched || [] }
  }

  async function take(list: FileList | File[]) {
    const files = [...list]
    setRows([]); setReports([]); setMessage('')
    if (!files.length) return
    setBusy(true)
    const reports: PriceReport[] = []
    const groups: PriceInput[][] = []
    try {
      for (const file of files) {
        const lines: string[] = []
        try {
          if (!accepted(file.name)) throw new Error('Нужен файл xlsx, csv или json')
          if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ')
          if (file.name.toLowerCase().endsWith('.xlsx')) {
            const result = await readMarketing(file)
            if (result.unmatched.length) lines.push(`Нет в каталоге: ${result.unmatched.join(', ')}`)
            for (const choice of result.choices.filter(choice => choice.skipped.length)) lines.push(`${choice.projectName}: берём «${choice.sourceName}», не берём ${choice.skipped.map(name => `«${name}»`).join(', ')}`)
            lines.push(result.rows.length ? `К обновлению: ${result.rows.length} цен` : 'Цен для обновления нет')
            groups.push(result.rows)
          } else {
            const data = parsePriceFile(await file.text())
            lines.push(`К обновлению: ${data.length} цен`)
            groups.push(data)
          }
        } catch (error) { lines.push(error instanceof Error ? error.message : 'Не удалось прочитать файл') }
        reports.push({ file: file.name, lines })
      }
      const merged = mergePriceRows(groups)
      const repeated = groups.reduce((sum, group) => sum + group.length, 0) - merged.length
      if (repeated > 0) reports.push({ file: 'Повторы', lines: [`${repeated} цен заменены более поздним файлом`] })
      if (merged.length) {
        const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: merged, dryRun: true }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setRows(merged)
        setMessage(`Проверено цен: ${merged.length}. Можно обновить прайс.`)
      } else setMessage('Цен для обновления нет.')
      setReports(reports)
    } catch (error) {
      setReports(reports)
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файлы')
    } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true)
    try {
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setReports(current => [...current, { file: 'Обновление', lines: [`Обновлено цен: ${result.updated}`] }])
      setMessage(`Прайс обновлён. Цен: ${result.updated}.`)
      setRows([])
      router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось обновить прайс') }
    finally { setBusy(false) }
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Цены</h1>
      <Button variant="outline" asChild><a href="data:text/csv;charset=utf-8,projectSlug%3Bconfiguration%3Bregion%3Bprice%0Abarnhouse-113%3Bstandard%3Bnn%3B5750000" download="price-template.csv">Шаблон CSV</a></Button>
    </div>
    <div className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-6 text-center ${drag ? 'bg-muted' : 'bg-card'}`} onDragEnter={event => { event.preventDefault(); setDrag(true) }} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={event => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setDrag(false) }} onDrop={event => { event.preventDefault(); setDrag(false); if (!busy) void take(event.dataTransfer.files) }}>
      <p className="text-sm text-muted-foreground">Перетащите один или несколько файлов прайса</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><IconUpload />{busy ? 'Обработка…' : 'Выбрать файлы'}</Button>
    </div>
    <input ref={fileInput} type="file" multiple className="hidden" accept=".csv,.json,.xlsx" disabled={busy} aria-label="Файлы прайса" onChange={event => { void take(event.target.files || []); event.target.value = '' }} />
    {message && <p role="status" className="text-sm">{message}</p>}
    {reports.length > 0 && <ul className="flex flex-col gap-3 text-sm">
      {reports.map((report, index) => <li key={`${report.file}:${index}`} className="rounded-lg border bg-card px-4 py-3">
        <p className="font-medium">{report.file}</p>
        {report.lines.map((line, lineIndex) => <p key={lineIndex} className={line.startsWith('Нет в каталоге') ? 'text-foreground' : 'text-muted-foreground'}>{line}</p>)}
      </li>)}
    </ul>}
    {rows.length > 0 && <>
      <DataTableFrame page={preview.page} pageCount={preview.pageCount} pageSize={preview.pageSize} onPage={preview.setPage} onPageSize={preview.setPageSize}>
        <Table>
          <colgroup><col className="w-[28%]" /><col className="w-[28%]" /><col className="w-[28%]" /><col className="w-[16%]" /></colgroup>
          <TableHeader><TableRow>
            <TableHead className="pl-4">Проект</TableHead>
            <TableHead>Комплектация</TableHead>
            <TableHead>Тип цены</TableHead>
            <TableHead className="pr-4 text-right">Цена, ₽</TableHead>
          </TableRow></TableHeader>
          <TableBody>{preview.rows.map(row => <TableRow key={`${row.projectSlug}:${row.configuration}:${row.region}`}>
            <TableCell className="pl-4">{row.projectSlug}</TableCell>
            <TableCell>{configurationNames[row.configuration]}</TableCell>
            <TableCell>{priceKinds.find(kind => kind.value === row.region)?.label}</TableCell>
            <TableCell className="pr-4 text-right tabular-nums">{row.price.toLocaleString('ru-RU')}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </DataTableFrame>
      <Button type="button" className="self-start" disabled={busy} onClick={() => void save()}>{busy ? 'Обновление…' : `Обновить ${rows.length} цен`}</Button>
    </>}
  </div>
}
