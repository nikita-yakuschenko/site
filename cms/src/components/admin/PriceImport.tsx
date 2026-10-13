'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { parsePriceFile, type PriceInput } from '../../config/price-import'
import { configurationNames } from '../../../../src/lib/catalog/configuration-rules'
import { Button } from '../ui/button'
import { IconUpload } from '@tabler/icons-react'

export function PriceImport() {
  const [rows, setRows] = useState<PriceInput[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [filename, setFilename] = useState('')
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
      setMessage(`Прайс загружен. Обновлено цен: ${result.updated}.`); setRows([])
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось загрузить прайс') }
    finally { setBusy(false) }
  }
  return <section className="shadcn-surface rounded-xl border p-4 flex flex-col gap-3">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Региональный прайс</h2><Link href="/collections/project-prices">Все цены</Link></div>
    <p className="text-sm text-muted-foreground">Загрузите CSV или JSON. Цены обновляются по проекту, комплектации и региону.</p>
    <a href="data:text/csv;charset=utf-8,projectSlug%3Bconfiguration%3Bregion%3Bprice%0Abarnhouse-113%3Bstandard%3Bnn%3B5750000" download="price-template.csv">Скачать шаблон CSV</a>
    <div className="flex items-center gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><IconUpload size={16} />{busy ? 'Обработка…' : 'Выбрать файл прайса'}</Button><span className="text-sm text-muted-foreground">{filename || 'CSV или JSON, до 2 МБ'}</span></div>
    <input ref={fileInput} type="file" className="hidden" accept=".csv,.json" disabled={busy} aria-label="Файл прайса" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
    {message && <p role="status" className="text-sm">{message}</p>}
    {rows.length > 0 && <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Проект</th><th>Комплектация</th><th>Регион</th><th>Цена, ₽</th></tr></thead><tbody>{rows.slice(0,5).map(row => <tr key={`${row.projectSlug}:${row.configuration}:${row.region}`}><td>{row.projectSlug}</td><td>{configurationNames[row.configuration]}</td><td>{row.region === 'nn' ? 'Нижний Новгород' : 'Москва'}</td><td>{row.price.toLocaleString('ru-RU')}</td></tr>)}</tbody></table></div><button type="button" disabled={busy} onClick={() => void save()} className="self-start rounded-lg border px-4 py-2">{busy ? 'Загрузка…' : `Загрузить ${rows.length} цен`}</button></>}
  </section>
}
