'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Project } from '../../payload-types'
import { TECHNOLOGY_OPTIONS, technologyLabel } from '../../../../src/lib/catalog/types'
import type { PriceKind } from '../../config/price-kinds'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { IconExternalLink, IconSearch, IconTrash, IconDots, IconPencil, IconCircleCheckFilled, IconCircleDashed, IconPlus } from '@tabler/icons-react'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'
import { rememberCatalogQuery, savedCatalogQuery } from './catalog-query'

const seriesLabels = { panel: 'Панельные', barn: 'Барнхаусы', classic: 'Классические', modular: 'Модульные', aframe: 'А-фрейм' } as const
// Числа в названии сравниваются как числа: «46» раньше «113», а не как текст.
const byName = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })
const emptyFacets = { status: [] as string[], tech: [] as string[], series: [] as string[], floors: [] as number[], bedrooms: [] as number[], bathrooms: [] as number[], areaMin: '', areaMax: '' }

function paramList(params: { get(name: string): string | null }, key: string) {
  return params.get(key)?.split(',').map(item => item.trim()).filter(Boolean) ?? []
}

function facetsFrom(params: { get(name: string): string | null }) {
  const numbers = (key: string) => paramList(params, key).map(Number).filter(value => Number.isInteger(value))
  return {
    status: paramList(params, 'status').filter(value => value === 'published' || value === 'draft'),
    tech: paramList(params, 'tech').filter(value => TECHNOLOGY_OPTIONS.some(option => option.value === value)),
    series: paramList(params, 'series'),
    floors: numbers('floors'),
    bedrooms: numbers('bedrooms'),
    bathrooms: numbers('bathrooms'),
    areaMin: params.get('areaMin') ?? '',
    areaMax: params.get('areaMax') ?? '',
  }
}

function inRange(value: number | null | undefined, min: string, max: string) {
  const bound = (raw: string) => raw.trim() === '' ? null : Number(raw.replace(/\s/g, ''))
  const lo = bound(min)
  const hi = bound(max)
  if ((lo != null && !Number.isFinite(lo)) || (hi != null && !Number.isFinite(hi))) return true
  if (lo == null && hi == null) return true
  if (value == null || !Number.isFinite(value)) return false
  return (lo == null || value >= lo) && (hi == null || value <= hi)
}

function FacetFilter<T extends string | number>({ title, options, selected, onChange }: {
  title: string
  options: { value: T; label: string }[]
  selected: T[]
  onChange: (next: T[]) => void
}) {
  if (options.length < 2) return null
  const picked = options.filter(option => selected.includes(option.value))
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="outline" size="sm" className="h-8 border-dashed">
        <IconPlus />{title}
        {picked.length > 0 && <Badge variant="secondary" className="rounded-sm px-1 font-normal">{picked.length > 2 ? picked.length : picked.map(option => option.label).join(', ')}</Badge>}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56">
      {options.map(option => <DropdownMenuCheckboxItem key={String(option.value)} checked={selected.includes(option.value)} onSelect={event => event.preventDefault()} onCheckedChange={checked => onChange(checked ? [...selected, option.value] : selected.filter(item => item !== option.value))}>{option.label}</DropdownMenuCheckboxItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}

function RangeFilter({ title, min, max, onMin, onMax }: { title: string; min: string; max: string; onMin: (value: string) => void; onMax: (value: string) => void }) {
  const label = min && max ? `${min}–${max}` : min ? `от ${min}` : max ? `до ${max}` : ''
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="outline" size="sm" className="h-8 border-dashed"><IconPlus />{title}{label && <Badge variant="secondary" className="rounded-sm px-1 font-normal">{label}</Badge>}</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-56 p-3">
      <div className="flex items-center gap-2">
        <Input aria-label={`${title}, от`} inputMode="numeric" placeholder="от" value={min} onChange={event => onMin(event.target.value)} />
        <Input aria-label={`${title}, до`} inputMode="numeric" placeholder="до" value={max} onChange={event => onMax(event.target.value)} />
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
}

function stat(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
}

export function CatalogIndex({ siteUrl, projects, leads }: { siteUrl: string; projects: Project[]; leads: Record<string, number> }) {
  const initial = useSearchParams()
  const [search, setSearch] = useState(initial.get('q') ?? '')
  const [recordType, setRecordType] = useState<'project' | 'ready-home'>(initial.get('tab') === 'ready' ? 'ready-home' : 'project')
  const [facets, setFacets] = useState<typeof emptyFacets>(() => facetsFrom(initial))
  const [removing, setRemoving] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [priceOptions, setPriceOptions] = useState<{ value: PriceKind; label: string; count: number }[]>([])
  const [selectedPriceKind, setSelectedPriceKind] = useState<PriceKind | null>(null)
  const [loadingPriceOptions, setLoadingPriceOptions] = useState(false)
  const [priceOptionsError, setPriceOptionsError] = useState('')
  const exportLock = useRef(false)
  const openExportDialog = async () => {
    setExportDialogOpen(true)
    setLoadingPriceOptions(true)
    setPriceOptionsError('')
    setPriceOptions([])
    setSelectedPriceKind(null)
    try {
      const response = await fetch('/api/projects/export-yml/options', { credentials: 'include', cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || 'Не удалось получить типы цен')
      const options = body.options as { value: PriceKind; label: string; count: number }[]
      setPriceOptions(options)
      setSelectedPriceKind(options.find(option => option.value === 'nn')?.value ?? options[0]?.value ?? null)
    } catch (error) {
      setPriceOptionsError(error instanceof Error ? error.message : 'Не удалось получить типы цен')
    } finally {
      setLoadingPriceOptions(false)
    }
  }
  const exportYml = async () => {
    if (exportLock.current || !selectedPriceKind) return
    exportLock.current = true
    setExporting(true)
    try {
      const response = await fetch('/api/projects/export-yml', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceKind: selectedPriceKind }) })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Не удалось выгрузить каталог')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = selectedPriceKind === 'nn' ? 'avgst-catalog.yml' : `avgst-catalog-${selectedPriceKind}.yml`
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`Выгружено проектов: ${response.headers.get('X-Export-Count') || '—'}`)
      const skipped = Number(response.headers.get('X-Export-Skipped'))
      if (skipped) toast.warning(`Пропущено проектов без корректной цены, технологии или изображения: ${skipped}`)
      setExportDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось выгрузить каталог')
    } finally {
      exportLock.current = false
      setExporting(false)
    }
  }
  const router = useRouter()
  const remove = async () => {
    if (!removing) return
    setBusy(true)
    const response = await fetch(`/api/projects/${removing.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return void toast.error('Не удалось удалить запись')
    toast.success('Запись удалена')
    setRemoving(null)
    router.refresh()
  }
  const query = search.trim().toLocaleLowerCase('ru')
  const projectCount = projects.filter(project => project.recordType === 'project').length
  const readyCount = projects.filter(project => project.recordType === 'ready-home').length
  const inTab = projects.filter(project => project.recordType === recordType)
  const numbers = (pick: (project: Project) => number | null | undefined) => [...new Set(inTab.map(pick).filter((value): value is number => typeof value === 'number'))].sort((a, b) => a - b)
  const filtered = inTab.filter(project => {
    const text = `${project.name ?? ''} ${project.slug ?? ''} ${project.technologyBadge ?? ''}`.toLocaleLowerCase('ru')
    if (query && !text.includes(query)) return false
    if (facets.status.length && !facets.status.includes(project._status === 'published' ? 'published' : 'draft')) return false
    if (facets.tech.length && !facets.tech.includes(project.technologyBadge)) return false
    if (facets.series.length && !facets.series.includes(project.series || 'none')) return false
    if (facets.floors.length && !facets.floors.includes(project.floorsValue)) return false
    if (facets.bedrooms.length && !facets.bedrooms.includes(project.bedrooms)) return false
    if (facets.bathrooms.length && !facets.bathrooms.includes(project.bathrooms)) return false
    return inRange(project.areaValue, facets.areaMin, facets.areaMax)
  }).sort((left, right) => byName.compare(left.name || '', right.name || ''))
  const table = useDataPage(filtered, {
    page: Math.max(0, (Number(initial.get('page')) || 1) - 1),
    pageSize: Number(initial.get('size')) || undefined,
  })
  const tune = (next: Partial<typeof emptyFacets>) => { setFacets(current => ({ ...current, ...next })); table.setPage(0) }
  const restored = useRef('')
  useLayoutEffect(() => {
    if (window.location.search.replace(/^\?/, '')) return
    const saved = savedCatalogQuery()
    if (!saved) return
    const params = new URLSearchParams(saved)
    restored.current = saved
    setSearch(params.get('q') ?? '')
    setRecordType(params.get('tab') === 'ready' ? 'ready-home' : 'project')
    setFacets(facetsFrom(params))
    const size = Number(params.get('size'))
    if ([15, 20, 30, 40, 50].includes(size)) table.setPageSize(size)
    table.setPage(Math.max(0, (Number(params.get('page')) || 1) - 1))
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${saved}${window.location.hash}`)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (recordType === 'ready-home') params.set('tab', 'ready')
    if (search.trim()) params.set('q', search.trim())
    const put = (key: string, values: Array<string | number>) => { if (values.length) params.set(key, values.join(',')) }
    put('status', facets.status)
    put('tech', facets.tech)
    put('series', facets.series)
    put('floors', facets.floors)
    put('bedrooms', facets.bedrooms)
    put('bathrooms', facets.bathrooms)
    if (facets.areaMin.trim()) params.set('areaMin', facets.areaMin.trim())
    if (facets.areaMax.trim()) params.set('areaMax', facets.areaMax.trim())
    if (table.page > 0) params.set('page', String(table.page + 1))
    if (table.pageSize !== 10) params.set('size', String(table.pageSize))
    const next = params.toString()
    if (restored.current && next !== restored.current) return
    restored.current = ''
    rememberCatalogQuery(next)
    if (next === window.location.search.replace(/^\?/, '')) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`)
  }, [recordType, search, facets, table.page, table.pageSize])
  const filtersOn = facets.status.length + facets.tech.length + facets.series.length + facets.floors.length + facets.bedrooms.length + facets.bathrooms.length > 0 || [facets.areaMin, facets.areaMax].some(Boolean)
  const seriesOrder = ['panel', 'barn', 'classic', 'modular', 'aframe', 'none']
  const seriesOptions = [...new Set(inTab.map(project => project.series || 'none'))].sort((a, b) => seriesOrder.indexOf(a) - seriesOrder.indexOf(b)).map(value => ({ value, label: value === 'none' ? 'Без серии' : seriesLabels[value as keyof typeof seriesLabels] }))
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={recordType} onValueChange={value => { setRecordType(value as 'project' | 'ready-home'); table.setPage(0) }}>
        <TabsList>
          <TabsTrigger value="project">Проекты домов <Badge variant="secondary">{projectCount}</Badge></TabsTrigger>
          <TabsTrigger value="ready-home">Готовые дома <Badge variant="secondary">{readyCount}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative w-full max-w-lg">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Поиск проектов" placeholder="Поиск проектов" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} />
        </div>
        <Button asChild variant="outline"><Link href="/catalog/redirects">Редиректы</Link></Button>
        <Button type="button" variant="outline" onClick={openExportDialog}>Выгрузить YML</Button>
        <Button asChild><Link href="/collections/projects/create">Создать</Link></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <FacetFilter title="Статус" options={[{ value: 'published', label: 'Опубликован' }, { value: 'draft', label: 'Черновик' }]} selected={facets.status} onChange={status => tune({ status })} />
      <FacetFilter title="Технология" options={[...TECHNOLOGY_OPTIONS]} selected={facets.tech} onChange={tech => tune({ tech })} />
      <FacetFilter title="Серия" options={seriesOptions} selected={facets.series} onChange={series => tune({ series })} />
      <RangeFilter title="Площадь, м²" min={facets.areaMin} max={facets.areaMax} onMin={areaMin => tune({ areaMin })} onMax={areaMax => tune({ areaMax })} />
      <FacetFilter title="Этажи" options={numbers(project => project.floorsValue).map(value => ({ value, label: String(value) }))} selected={facets.floors} onChange={floors => tune({ floors })} />
      <FacetFilter title="Спальни" options={numbers(project => project.bedrooms).map(value => ({ value, label: String(value) }))} selected={facets.bedrooms} onChange={bedrooms => tune({ bedrooms })} />
      <FacetFilter title="Санузлы" options={numbers(project => project.bathrooms).map(value => ({ value, label: String(value) }))} selected={facets.bathrooms} onChange={bathrooms => tune({ bathrooms })} />
      {filtersOn && <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => tune(emptyFacets)}>Сбросить</Button>}
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table>
      {/* Доли ширины окна, не содержимого страницы: технология на «Панельно-каркасная», статус на бейдж, площадь на заголовок. */}
      <colgroup>
        <col style={{ width: '19%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} />
        <col style={{ width: '9%' }} /><col style={{ width: '6%' }} /><col style={{ width: '7%' }} /><col style={{ width: '10%' }} /><col style={{ width: '6%' }} /><col style={{ width: '5%' }} /><col style={{ width: '7%' }} /><col style={{ width: '5%' }} />
      </colgroup>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground"><TableHead className="pl-4">Название</TableHead><TableHead>Статус</TableHead><TableHead>Технология</TableHead><TableHead className="text-right">Площадь, м²</TableHead><TableHead className="text-right">Этажи</TableHead><TableHead className="text-right">Спальни</TableHead><TableHead className="text-right">Просмотры</TableHead><TableHead className="text-right">Лайки</TableHead><TableHead className="text-right">Шеры</TableHead><TableHead className="text-right">Заявки</TableHead><TableHead className="pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{table.rows.map(project => { const published = project._status === 'published'; return <TableRow key={project.id}>
        <TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/projects/${project.id}`}>{project.name || '[Без названия]'}</Link>{(project.hero_product === 1 || project.hero_product === 2) && <Badge variant="secondary" className="mt-1 w-fit">Слот №{project.hero_product}</Badge>}</TableCell>
        <TableCell><Badge variant="outline" className="text-foreground">{published ? <IconCircleCheckFilled className="text-(--avgst-green)" /> : <IconCircleDashed className="text-muted-foreground" />}{published ? 'Опубликован' : 'Черновик'}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{technologyLabel(project.technologyBadge)}</TableCell><TableCell className="text-right tabular-nums">{project.areaValue?.toLocaleString('ru-RU') ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.floorsValue ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.bedrooms ?? '—'}</TableCell>
        <TableCell className="text-right tabular-nums">{stat(project.viewCount)}</TableCell><TableCell className="text-right tabular-nums">{stat(project.likeCount)}</TableCell><TableCell className="text-right tabular-nums">{stat(project.shareCount)}</TableCell><TableCell className="text-right tabular-nums">{leads[project.id] ?? 0}</TableCell>
        <TableCell className="catalog-actions pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" aria-label={`Действия: ${project.name || 'без названия'}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44">
          <DropdownMenuItem asChild><Link href={`/collections/projects/${project.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem>
          {published && project.slug && <DropdownMenuItem asChild><a href={`${siteUrl}/catalog/${project.slug}`} target="_blank" rel="noreferrer"><IconExternalLink />Открыть на сайте</a></DropdownMenuItem>}
          <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(project)}><IconTrash />Удалить</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow> })}{table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={11} className="h-24 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody>
    </Table></DataTableFrame>
    <Dialog open={exportDialogOpen} onOpenChange={open => { if (!exporting) setExportDialogOpen(open) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>Выгрузить каталог в YML</DialogTitle><DialogDescription>Выберите тип цены для предложений в файле.</DialogDescription></DialogHeader>
      {loadingPriceOptions ? <p className="text-sm text-muted-foreground">Загрузка типов цен…</p> : priceOptionsError ? <p role="alert" className="text-sm text-destructive">{priceOptionsError}</p> : priceOptions.length === 0 ? <p className="text-sm text-muted-foreground">Нет опубликованных проектов с ценой и данными для выгрузки.</p> : <fieldset className="grid gap-2" disabled={exporting}>
        <legend className="sr-only">Тип цены</legend>
        {priceOptions.map(option => <label key={option.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-muted">
          <span className="flex items-center gap-2"><input type="radio" name="yml-price-kind" value={option.value} checked={selectedPriceKind === option.value} onChange={() => setSelectedPriceKind(option.value)} />{option.label}</span>
          <span className="text-muted-foreground">{option.count} проектов</span>
        </label>)}
      </fieldset>}
      <DialogFooter><Button type="button" variant="outline" disabled={exporting} onClick={() => setExportDialogOpen(false)}>Отмена</Button><Button type="button" disabled={!selectedPriceKind || loadingPriceOptions || exporting} aria-busy={exporting} onClick={exportYml}>{exporting ? 'Формирование…' : 'Скачать YML'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>Удалить «{removing?.name || '[Без названия]'}»?</DialogTitle><DialogDescription>Запись пропадёт из каталога и с сайта вместе с её ценами. Отменить удаление нельзя.</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Отмена</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
