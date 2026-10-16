'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconCircleCheck, IconFileSpreadsheet, IconLoader2, IconUpload } from '@tabler/icons-react'
import { mergePriceRows, parsePriceFile, type PriceInput } from '../../config/price-import'
import type { MarketingChoice } from '../../config/marketing-prices'
import { configurationNames } from '../../../../src/lib/catalog/configuration-rules'
import { priceKinds } from '../../config/price-kinds'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block'
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from '../ui/trace'
import { DataTableFrame, useDataPage } from './DataTable'

type PriceReport = { file: string; error?: string; unmatched: string[]; layouts: MarketingChoice[]; ready: number; note?: string }
type Preview = { rows: PriceInput[]; choices: MarketingChoice[]; unmatched: string[] }

const accepted = (name: string) => /\.(xlsx|csv|json)$/i.test(name)
const countLabel = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10
  const mod100 = count % 100
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${count} ${word}`
}

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
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const preview = useDataPage(rows)
  const missing = reports.reduce((sum, report) => sum + report.unmatched.length, 0)
  const failed = reports.filter(report => report.error).length

  async function readMarketing(file: File): Promise<Preview> {
    const response = await fetch('/api/project-prices/preview-marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, file: await fileBase64(file) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    return { rows: result.rows || [], choices: result.choices || [], unmatched: result.unmatched || [] }
  }

  async function take(list: FileList | File[]) {
    const files = [...list]
    setRows([]); setReports([]); setMessage(''); setSaved('')
    if (!files.length) return
    setBusy(true)
    const next: PriceReport[] = []
    const groups: PriceInput[][] = []
    try {
      for (const file of files) {
        try {
          if (!accepted(file.name)) throw new Error('Нужен файл xlsx, csv или json')
          if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ')
          if (file.name.toLowerCase().endsWith('.xlsx')) {
            const result = await readMarketing(file)
            next.push({ file: file.name, unmatched: result.unmatched, layouts: result.choices.filter(choice => choice.skipped.length), ready: result.rows.length })
            groups.push(result.rows)
          } else {
            const data = parsePriceFile(await file.text())
            next.push({ file: file.name, unmatched: [], layouts: [], ready: data.length })
            groups.push(data)
          }
        } catch (error) {
          next.push({ file: file.name, error: error instanceof Error ? error.message : 'Не удалось прочитать файл', unmatched: [], layouts: [], ready: 0 })
        }
      }
      const merged = mergePriceRows(groups)
      const repeated = groups.reduce((sum, group) => sum + group.length, 0) - merged.length
      if (repeated > 0) next.push({ file: 'Повторы', note: `${countLabel(repeated, 'цена', 'цены', 'цен')} заменены более поздним файлом`, unmatched: [], layouts: [], ready: 0 })
      if (merged.length) {
        const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: merged, dryRun: true }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setRows(merged)
      }
      setReports(next)
      setMessage(merged.length ? `Можно обновить ${countLabel(merged.length, 'цену', 'цены', 'цен')}.` : 'Цен для обновления нет.')
    } catch (error) {
      setReports(next)
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файлы')
    } finally { setBusy(false) }
  }

  async function save() {
    setBusy(true)
    try {
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setSaved(`Обновлено ${countLabel(result.updated, 'цена', 'цены', 'цен')}.`)
      setMessage('')
      setRows([])
      router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось обновить прайс') }
    finally { setBusy(false) }
  }

  const summary = failed ? 'Часть файлов не прочитана' : missing ? `Нет в каталоге: ${countLabel(missing, 'проект', 'проекта', 'проектов')}` : 'Прайс проверен'

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Цены</h1>
      <Button variant="outline" asChild><a href="data:text/csv;charset=utf-8,projectSlug%3Bconfiguration%3Bregion%3Bprice%0Abarnhouse-113%3Bstandard%3Bnn%3B5750000" download="price-template.csv">Шаблон CSV</a></Button>
    </div>
    <div className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border bg-card px-4 py-8 text-center ${drag ? 'ring-3 ring-ring/50' : ''}`} onDragEnter={event => { event.preventDefault(); setDrag(true) }} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={event => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setDrag(false) }} onDrop={event => { event.preventDefault(); setDrag(false); if (!busy) void take(event.dataTransfer.files) }}>
      <p className="text-sm text-muted-foreground">Перетащите один или несколько файлов прайса</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><IconUpload />{busy ? 'Обработка…' : 'Выбрать файлы'}</Button>
    </div>
    <input ref={fileInput} type="file" multiple className="hidden" accept=".csv,.json,.xlsx" disabled={busy} aria-label="Файлы прайса" onChange={event => { void take(event.target.files || []); event.target.value = '' }} />
    <Trace>
      {busy && <TraceLine status="running"><TraceIcon><IconLoader2 className="animate-spin" /></TraceIcon><TraceTitle>Читаем файлы прайса</TraceTitle></TraceLine>}
      {saved && <TraceLine><TraceIcon><IconCircleCheck /></TraceIcon><TraceTitle>{saved}</TraceTitle></TraceLine>}
      {reports.length > 0 && <TraceCollapsible defaultOpen={missing > 0 || failed > 0}>
        <TraceCollapsibleTrigger>
          <TraceLine status={missing || failed ? 'error' : undefined}>
            <TraceIcon><IconFileSpreadsheet /></TraceIcon>
            <TraceTitle>{summary}</TraceTitle>
            <TraceDescription>{countLabel(reports.filter(report => !report.note).length, 'файл', 'файла', 'файлов')}</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent>
          <Trace>
            {reports.map((report, index) => report.note ? <TraceLine key={`${report.file}:${index}`}><TraceTitle>{report.note}</TraceTitle></TraceLine> : report.error || (!report.unmatched.length && !report.layouts.length) ? <TraceLine key={`${report.file}:${index}`} status={report.error ? 'error' : undefined}><TraceIcon><IconFileSpreadsheet /></TraceIcon><TraceTitle>{report.error || report.file}</TraceTitle>{!report.error && <TraceDescription>{countLabel(report.ready, 'цена', 'цены', 'цен')}</TraceDescription>}</TraceLine> : <TraceCollapsible key={`${report.file}:${index}`} defaultOpen={report.unmatched.length > 0}>
              <TraceCollapsibleTrigger>
                <TraceLine status={report.unmatched.length ? 'error' : undefined}>
                  <TraceIcon><IconFileSpreadsheet /></TraceIcon>
                  <TraceTitle>{report.file}</TraceTitle>
                  <TraceDescription>{report.unmatched.length ? `нет в каталоге ${report.unmatched.length}` : countLabel(report.ready, 'цена', 'цены', 'цен')}</TraceDescription>
                </TraceLine>
              </TraceCollapsibleTrigger>
              <TraceCollapsibleContent className="flex flex-col gap-3">
                {report.unmatched.length > 0 && <CodeBlock size="sm" variant="destructive" className="text-foreground">
                  <CodeBlockHeader>
                    <CodeBlockTitle>Нет в каталоге</CodeBlockTitle>
                    <CodeBlockActions><CodeBlockCopyButton value={report.unmatched.join('\n')} /></CodeBlockActions>
                  </CodeBlockHeader>
                  <CodeBlockContent lineNumbers>{report.unmatched.join('\n')}</CodeBlockContent>
                </CodeBlock>}
                {report.layouts.length > 0 && <Trace>
                  {report.layouts.map(choice => <TraceLine key={choice.projectName}><TraceTitle>{choice.projectName}: берём «{choice.sourceName}»</TraceTitle></TraceLine>)}
                </Trace>}
              </TraceCollapsibleContent>
            </TraceCollapsible>)}
          </Trace>
        </TraceCollapsibleContent>
      </TraceCollapsible>}
    </Trace>
    {message && <p role="status" className="text-sm">{message}</p>}
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
      <Button type="button" className="self-start" disabled={busy} onClick={() => void save()}>{busy ? 'Обновление…' : `Обновить ${countLabel(rows.length, 'цену', 'цены', 'цен')}`}</Button>
    </>}
  </div>
}
