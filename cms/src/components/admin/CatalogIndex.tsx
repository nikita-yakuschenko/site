'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project } from '../../payload-types'
import { useRouter } from 'next/navigation'
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

const seriesLabels = { panel: 'Панельные', barn: 'Барнхаусы', classic: 'Классические', modular: 'Модульные' } as const
const emptyFacets = { status: [] as string[], tech: [] as string[], series: [] as string[], floors: [] as number[], bedrooms: [] as number[], bathrooms: [] as number[], areaMin: '', areaMax: '' }

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

export function CatalogIndex({ siteUrl, projects }: { siteUrl: string; projects: Project[] }) {
  const [search, setSearch] = useState('')
  const [recordType, setRecordType] = useState<'project' | 'ready-home'>('project')
  const [facets, setFacets] = useState(emptyFacets)
  const [removing, setRemoving] = useState<Project | null>(null)
  const [busy, setBusy] = useState(false)
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
  })
  const table = useDataPage(filtered)
  const tune = (next: Partial<typeof emptyFacets>) => { setFacets(current => ({ ...current, ...next })); table.setPage(0) }
  const filtersOn = facets.status.length + facets.tech.length + facets.series.length + facets.floors.length + facets.bedrooms.length + facets.bathrooms.length > 0 || [facets.areaMin, facets.areaMax].some(Boolean)
  const seriesOrder = ['panel', 'barn', 'classic', 'modular', 'none']
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
        <Button asChild><Link href="/collections/projects/create">Создать</Link></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <FacetFilter title="Статус" options={[{ value: 'published', label: 'Опубликован' }, { value: 'draft', label: 'Черновик' }]} selected={facets.status} onChange={status => tune({ status })} />
      <FacetFilter title="Технология" options={[{ value: 'Панельно-каркасный', label: 'Панельно-каркасная' }, { value: 'Модульный', label: 'Модульная' }]} selected={facets.tech} onChange={tech => tune({ tech })} />
      <FacetFilter title="Серия" options={seriesOptions} selected={facets.series} onChange={series => tune({ series })} />
      <RangeFilter title="Площадь, м²" min={facets.areaMin} max={facets.areaMax} onMin={areaMin => tune({ areaMin })} onMax={areaMax => tune({ areaMax })} />
      <FacetFilter title="Этажи" options={numbers(project => project.floorsValue).map(value => ({ value, label: String(value) }))} selected={facets.floors} onChange={floors => tune({ floors })} />
      <FacetFilter title="Спальни" options={numbers(project => project.bedrooms).map(value => ({ value, label: String(value) }))} selected={facets.bedrooms} onChange={bedrooms => tune({ bedrooms })} />
      <FacetFilter title="Санузлы" options={numbers(project => project.bathrooms).map(value => ({ value, label: String(value) }))} selected={facets.bathrooms} onChange={bathrooms => tune({ bathrooms })} />
      {filtersOn && <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => tune(emptyFacets)}>Сбросить</Button>}
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table>
      <colgroup><col className="w-[18%]" /><col className="w-[16%]" /><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[6%]" /></colgroup>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground"><TableHead className="pl-4">Название</TableHead><TableHead>Статус</TableHead><TableHead>Технология</TableHead><TableHead className="text-right">Площадь, м²</TableHead><TableHead className="text-right">Этажи</TableHead><TableHead className="text-right">Спальни</TableHead><TableHead className="pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{table.rows.map(project => { const published = project._status === 'published'; return <TableRow key={project.id}>
        <TableCell className="h-12 whitespace-nowrap pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/projects/${project.id}`}>{project.name || '[Без названия]'}</Link></TableCell>
        <TableCell><Badge variant="outline" className="text-foreground">{published ? <IconCircleCheckFilled className="text-(--avgst-green)" /> : <IconCircleDashed className="text-muted-foreground" />}{published ? 'Опубликован' : 'Черновик'}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{project.technologyBadge === 'Модульный' ? 'Модульная' : 'Панельно-каркасная'}</TableCell><TableCell className="text-right tabular-nums">{project.areaValue?.toLocaleString('ru-RU') ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.floorsValue ?? '—'}</TableCell><TableCell className="text-right tabular-nums">{project.bedrooms ?? '—'}</TableCell>
        <TableCell className="pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground data-[state=open]:bg-muted" aria-label={`Действия: ${project.name || 'без названия'}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44">
          <DropdownMenuItem asChild><Link href={`/collections/projects/${project.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem>
          {published && project.slug && <DropdownMenuItem asChild><a href={`${siteUrl}/catalog/${project.slug}`} target="_blank" rel="noreferrer"><IconExternalLink />Открыть на сайте</a></DropdownMenuItem>}
          <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(project)}><IconTrash />Удалить</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow> })}{table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Записи не найдены</TableCell></TableRow>}</TableBody>
    </Table></DataTableFrame>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>Удалить «{removing?.name || '[Без названия]'}»?</DialogTitle><DialogDescription>Запись пропадёт из каталога и с сайта вместе с её ценами. Отменить удаление нельзя.</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Отмена</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
