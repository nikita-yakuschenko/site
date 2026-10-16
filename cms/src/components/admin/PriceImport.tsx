'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconCircleCheck, IconFileSpreadsheet, IconLoader2, IconUpload } from '@tabler/icons-react'
import { mergePriceRows, parsePriceFile, type PriceInput } from '../../config/price-import'
import type { MarketingChoice, MarketingIssue } from '../../config/marketing-prices'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle } from '../ui/code-block'
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from '../ui/trace'

type PriceReport = { file: string; error?: string; unmatched: string[]; issues: MarketingIssue[]; layouts: MarketingChoice[]; ready: number; note?: string }
type Preview = { rows: PriceInput[]; choices: MarketingChoice[]; unmatched: string[]; issues: MarketingIssue[] }

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
  const [reading, setReading] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const logPane = useRef<HTMLDivElement>(null)
  const missing = reports.reduce((sum, report) => sum + report.unmatched.length, 0)
  const failed = reports.filter(report => report.error).length
  const skipped = reports.reduce((sum, report) => sum + report.issues.length, 0)
  const outcome = reading
    ? `Читаем «${reading}»`
    : busy
      ? rows.length ? 'Записываем цены' : 'Проверяем прайс'
      : [rows.length ? `К записи ${countLabel(rows.length, 'цена', 'цены', 'цен')}.` : reports.length ? 'К записи нет ни одной цены.' : '', skipped ? `${countLabel(skipped, 'проект пропущен', 'проекта пропущены', 'проектов пропущены')}.` : '', missing ? `${countLabel(missing, 'проект', 'проекта', 'проектов')} нет в каталоге.` : '', failed ? `${countLabel(failed, 'файл не прочитан', 'файла не прочитаны', 'файлов не прочитаны')}.` : ''].filter(Boolean).join(' ')

  useEffect(() => {
    const pane = logPane.current
    if (pane) pane.scrollTop = pane.scrollHeight
  }, [reports, reading, saved, busy, message])

  async function readMarketing(file: File): Promise<Preview> {
    const response = await fetch('/api/project-prices/preview-marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, file: await fileBase64(file) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    return { rows: result.rows || [], choices: result.choices || [], unmatched: result.unmatched || [], issues: result.issues || [] }
  }

  async function take(list: FileList | File[]) {
    const files = [...list]
    setRows([]); setReports([]); setMessage(''); setSaved(''); setReading('')
    if (!files.length) return
    setLogOpen(true)
    setBusy(true)
    const next: PriceReport[] = []
    const groups: PriceInput[][] = []
    try {
      for (const file of files) {
        setReading(file.name)
        try {
          if (!accepted(file.name)) throw new Error('Нужен файл xlsx, csv или json')
          if (file.size > 2 * 1024 * 1024) throw new Error('Файл больше 2 МБ')
          if (file.name.toLowerCase().endsWith('.xlsx')) {
            const result = await readMarketing(file)
            next.push({ file: file.name, unmatched: result.unmatched, issues: result.issues, layouts: result.choices.filter(choice => choice.skipped.length), ready: result.rows.length })
            groups.push(result.rows)
          } else {
            const data = parsePriceFile(await file.text())
            next.push({ file: file.name, unmatched: [], issues: [], layouts: [], ready: data.length })
            groups.push(data)
          }
        } catch (error) {
          next.push({ file: file.name, error: error instanceof Error ? error.message : 'Не удалось прочитать файл', unmatched: [], issues: [], layouts: [], ready: 0 })
        }
        setReports([...next])
      }
      setReading('')
      const merged = mergePriceRows(groups)
      const repeated = groups.reduce((sum, group) => sum + group.length, 0) - merged.length
      if (repeated > 0) next.push({ file: 'Повторы', note: `${countLabel(repeated, 'цена', 'цены', 'цен')} заменены более поздним файлом`, unmatched: [], issues: [], layouts: [], ready: 0 })
      if (merged.length) {
        const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: merged, dryRun: true }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        setRows(merged)
      }
      setReports(next)
      setMessage('')
    } catch (error) {
      setReports(next)
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файлы')
    } finally { setReading(''); setBusy(false) }
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

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Цены</h1>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setLogOpen(true)}><IconUpload />Выбрать файлы</Button>
        <Button variant="outline" asChild><a href="data:text/csv;charset=utf-8,projectSlug%3Bconfiguration%3Bregion%3Bprice%0Abarnhouse-113%3Bstandard%3Bnn%3B5750000" download="price-template.csv">Шаблон CSV</a></Button>
      </div>
    </div>
    <input ref={fileInput} type="file" multiple className="hidden" accept=".csv,.json,.xlsx" disabled={busy} aria-label="Файлы прайса" onChange={event => { void take(event.target.files || []); event.target.value = '' }} />
    <Dialog open={logOpen} onOpenChange={setLogOpen}>
      <DialogContent style={{ display: 'flex' }} className="shadcn-surface h-[36rem] max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Загрузка прайса</DialogTitle>
          <DialogDescription>{saved || outcome || 'Перетащите один или несколько файлов прайса'}</DialogDescription>
        </DialogHeader>
        <div className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-4 text-center ${drag ? 'ring-3 ring-ring/50' : ''}`} onDragEnter={event => { event.preventDefault(); setDrag(true) }} onDragOver={event => { event.preventDefault(); setDrag(true) }} onDragLeave={event => { if (event.currentTarget.contains(event.relatedTarget as Node)) return; setDrag(false) }} onDrop={event => { event.preventDefault(); setDrag(false); if (!busy) void take(event.dataTransfer.files) }}>
          <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><IconUpload />{busy ? 'Обработка…' : 'Выбрать файлы'}</Button>
        </div>
        <div ref={logPane} className="price-log min-h-0 flex-1 overflow-y-auto">
          <Trace>
            {reports.map((report, index) => {
              const detail = report.note || report.error || [countLabel(report.ready, 'цена к записи', 'цены к записи', 'цен к записи'), report.issues.length ? `${report.issues.length} пропущено` : '', report.unmatched.length ? `${report.unmatched.length} нет в каталоге` : ''].filter(Boolean).join(' · ')
              const problem = Boolean(report.error || report.issues.length || report.unmatched.length)
              return report.note || report.error || (!report.unmatched.length && !report.issues.length && !report.layouts.length) ? <TraceLine key={`${report.file}:${index}`} status={report.error ? 'error' : undefined}><TraceIcon><IconFileSpreadsheet /></TraceIcon><TraceTitle>{report.note || report.file}</TraceTitle>{!report.note && <TraceDescription>{detail}</TraceDescription>}</TraceLine> : <TraceCollapsible key={`${report.file}:${index}`} defaultOpen={problem}>
                <TraceCollapsibleTrigger>
                  <TraceLine status={problem ? 'error' : undefined}>
                    <TraceIcon><IconFileSpreadsheet /></TraceIcon>
                    <TraceTitle>{report.file}</TraceTitle>
                    <TraceDescription>{detail}</TraceDescription>
                  </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent className="flex flex-col gap-3">
                  {report.issues.length > 0 && <Trace>{report.issues.map(issue => <TraceLine key={`${issue.kind}:${issue.projectName}`} status="error"><TraceTitle>{issue.detail}</TraceTitle></TraceLine>)}</Trace>}
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
              </TraceCollapsible>
            })}
            {busy && <TraceLine status="running"><TraceIcon><IconLoader2 className="animate-spin" /></TraceIcon><TraceTitle>{reading ? `Читаем «${reading}»` : rows.length ? 'Записываем цены' : 'Проверяем прайс'}</TraceTitle></TraceLine>}
            {saved && !busy && <TraceLine><TraceIcon><IconCircleCheck /></TraceIcon><TraceTitle>{saved}</TraceTitle></TraceLine>}
          </Trace>
        </div>
        {message && <p role="status" className="text-sm">{message}</p>}
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Закрыть</Button></DialogClose>
          {rows.length > 0 && <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Обновление…' : `Обновить ${countLabel(rows.length, 'цену', 'цены', 'цен')}`}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
