'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { IconCircleCheckFilled, IconCircleDashed, IconDots, IconExternalLink, IconPencil, IconSearch, IconTrash } from '@tabler/icons-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

type StoryRow = {
  id: number | string
  heading?: string | null
  slug?: string | null
  subtitle?: string | null
  place?: string | null
  year?: number | null
  customerKind?: 'family' | 'business' | null
  binding?: 'catalog' | 'individual' | 'discontinued' | null
  _status?: 'published' | 'draft' | null
}

const customers = { family: 'Частное лицо', business: 'Бизнес' }
const bindings = { catalog: 'Каталог', individual: 'Индивидуальный проект', discontinued: 'Снят с производства' }
const byName = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' })

export function StoriesIndex({ siteUrl, stories }: { siteUrl: string; stories: StoryRow[] }) {
  const [search, setSearch] = useState('')
  const [removing, setRemoving] = useState<StoryRow | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const remove = async () => {
    if (!removing) return
    setBusy(true)
    const response = await fetch(`/api/stories/${removing.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    setBusy(false)
    if (!response?.ok) return void toast.error('Не удалось удалить отзыв')
    toast.success('Отзыв удалён')
    setRemoving(null)
    router.refresh()
  }
  const query = search.trim().toLocaleLowerCase('ru')
  const filtered = stories.filter(story => {
    const text = `${story.heading ?? ''} ${story.subtitle ?? ''} ${story.place ?? ''} ${story.year ?? ''}`.toLocaleLowerCase('ru')
    return !query || text.includes(query)
  }).sort((left, right) => (right.year ?? 0) - (left.year ?? 0) || byName.compare(left.heading || '', right.heading || ''))
  const table = useDataPage(filtered)
  return <>
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="relative w-full max-w-lg">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Поиск отзывов" placeholder="Поиск отзывов" className="pl-9" value={search} onChange={event => { setSearch(event.target.value); table.setPage(0) }} />
      </div>
      <Button asChild><Link href="/collections/stories/create">Создать</Link></Button>
    </div>
    <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}><Table>
      <TableHeader><TableRow className="hover:bg-transparent [&>th]:text-muted-foreground"><TableHead className="pl-4">Заголовок</TableHead><TableHead>Статус</TableHead><TableHead>Заказчик</TableHead><TableHead>Год</TableHead><TableHead>Локация</TableHead><TableHead>Проект</TableHead><TableHead className="pr-4"><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
      <TableBody>{table.rows.map(story => { const published = story._status === 'published'; return <TableRow key={story.id}>
        <TableCell className="h-12 pl-4"><Link className="font-medium underline-offset-4 hover:underline" href={`/collections/stories/${story.id}`}>{story.heading || '[Без заголовка]'}</Link></TableCell>
        <TableCell><Badge variant="outline" className="text-foreground">{published ? <IconCircleCheckFilled className="text-(--avgst-green)" /> : <IconCircleDashed className="text-muted-foreground" />}{published ? 'Опубликован' : 'Черновик'}</Badge></TableCell>
        <TableCell className="text-muted-foreground">{story.customerKind ? customers[story.customerKind] : '—'}</TableCell>
        <TableCell className="tabular-nums">{story.year ?? '—'}</TableCell>
        <TableCell className="text-muted-foreground">{story.place || '—'}</TableCell>
        <TableCell className="text-muted-foreground">{story.binding ? bindings[story.binding] : '—'}</TableCell>
        <TableCell className="pr-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Действия: ${story.heading || 'без заголовка'}`}><IconDots className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="shadcn-surface w-44">
          <DropdownMenuItem asChild><Link href={`/collections/stories/${story.id}`}><IconPencil />Редактировать</Link></DropdownMenuItem>
          {published && story.slug && <DropdownMenuItem asChild><a href={`${siteUrl}/stories#story-${story.slug}`} target="_blank" rel="noreferrer"><IconExternalLink />Открыть на сайте</a></DropdownMenuItem>}
          <DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => setRemoving(story)}><IconTrash />Удалить</DropdownMenuItem>
        </DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow> })}{table.rows.length === 0 && <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Отзывы не найдены</TableCell></TableRow>}</TableBody>
    </Table></DataTableFrame>
    <Dialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null) }}><DialogContent className="shadcn-surface">
      <DialogHeader><DialogTitle>Удалить «{removing?.heading || '[Без заголовка]'}»?</DialogTitle><DialogDescription>Отзыв пропадёт из раздела и с сайта. Отменить удаление нельзя.</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Отмена</Button></DialogClose><Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Удаление…' : 'Удалить'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </>
}
