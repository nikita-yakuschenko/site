'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parsePriceFile, type PriceInput } from '../../config/price-import'
import { configurationNames } from '../../../../src/lib/catalog/configuration-rules'
import { priceKinds } from '../../config/price-kinds'
import { Button } from '../ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { IconUpload } from '@tabler/icons-react'
import { DataTableFrame, useDataPage } from './DataTable'

export function PriceImport() {
  const router = useRouter()
  const [rows, setRows] = useState<PriceInput[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [filename, setFilename] = useState('')
  const preview = useDataPage(rows)
  async function upload(file?: File) {
    setRows([]); setMessage('')
    if (!file) return
    setFilename(file.name)
    setBusy(true)
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Файл должен быть меньше 2 МБ')
      const data = parsePriceFile(await file.text())
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: data, dryRun: true }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setRows(data); setMessage(`Проверено строк: ${data.length}. Можно загрузить прайс.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файл') }
    finally { setBusy(false) }
  }
  async function save() {
    setBusy(true)
    try {
      const response = await fetch('/api/project-prices/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)
      setMessage(`Прайс загружен. Обновлено цен: ${result.updated}.`); setRows([]); setFilename('')
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
    <input ref={fileInput} type="file" className="hidden" accept=".csv,.json" disabled={busy} aria-label="Файл прайса" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
    {message && <p role="status" className="text-sm">{message}</p>}
    {rows.length > 0 && <>
      <DataTableFrame page={preview.page} pageCount={preview.pageCount} pageSize={preview.pageSize} onPage={preview.setPage} onPageSize={preview.setPageSize}>
        <Table>
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
