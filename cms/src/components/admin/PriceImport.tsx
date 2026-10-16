'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parsePriceFile, type PriceInput } from '../../config/price-import'
import type { MarketingChoice } from '../../config/marketing-prices'
import { configurationNames } from '../../../../src/lib/catalog/configuration-rules'
import { priceKinds } from '../../config/price-kinds'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { IconUpload } from '@tabler/icons-react'
import { DataTableFrame, useDataPage } from './DataTable'

export function PriceImport() {
  const router = useRouter()
  const [rows, setRows] = useState<PriceInput[]>([])
  const [choices, setChoices] = useState<MarketingChoice[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [filename, setFilename] = useState('')
  const preview = useDataPage(rows)
  async function upload(file?: File) {
    setRows([]); setChoices([]); setUnmatched([]); setMessage('')
    if (!file) return
    setFilename(file.name)
    setBusy(true)
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Файл должен быть меньше 2 МБ')
      const marketing = file.name.toLowerCase().endsWith('.xlsx')
      const payload = marketing ? await marketingPayload(file) : parsePriceFile(await file.text())
      if (marketing) return
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: payload, dryRun: true }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setRows(payload); setMessage(`Проверено строк: ${payload.length}. Можно загрузить прайс.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файл') }
    finally { setBusy(false) }
  }
  async function marketingPayload(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    const response = await fetch('/api/project-prices/preview-marketing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, file: btoa(binary) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    const found: MarketingChoice[] = result.choices || []
    const missing: string[] = result.unmatched || []
    setChoices(found)
    setUnmatched(missing)
    if (missing.length) throw new Error(`Не найдены проекты: ${missing.join(', ')}`)
    const data = result.rows as PriceInput[]
    setRows(data)
    setMessage(`Проверено строк: ${data.length}. Можно загрузить прайс.`)
    return data
  }
  async function save() {
    setBusy(true)
    try {
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setMessage(`Прайс загружен. Обновлено цен: ${result.updated}.`); setRows([]); setChoices([]); setUnmatched([]); setFilename('')
      router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось загрузить прайс') }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Цены</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" asChild><a href="data:text/csv;charset=utf-8,projectSlug%3Bconfiguration%3Bregion%3Bprice%0Abarnhouse-113%3Bstandard%3Bnn%3B5750000" download="price-template.csv">Шаблон CSV</a></Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><IconUpload />{busy ? 'Обработка…' : 'Обновить прайс'}</Button>
        {filename && <span className="text-sm text-muted-foreground">{filename}</span>}
      </div>
    </div>
    <input ref={fileInput} type="file" className="hidden" accept=".csv,.json,.xlsx" disabled={busy} aria-label="Файл прайса" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
    {message && <p role="status" className="text-sm">{message}</p>}
    {unmatched.length > 0 && <p className="text-sm">Цены не загружены, пока каждый дом из файла не найден среди проектов этой технологии.</p>}
    {choices.some(choice => choice.skipped.length > 0) && <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
      {choices.filter(choice => choice.skipped.length > 0).map(choice => <li key={choice.projectName}>{choice.projectName}: берём «{choice.sourceName}», не берём {choice.skipped.map(name => `«${name}»`).join(', ')}</li>)}
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
      <Button type="button" className="self-start" disabled={busy} onClick={() => void save()}>{busy ? 'Загрузка…' : `Загрузить ${rows.length} цен`}</Button>
    </>}
  </div>
}
