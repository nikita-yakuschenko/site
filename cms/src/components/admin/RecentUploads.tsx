'use client'

import Link from 'next/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { DataTableFrame, useDataPage } from './DataTable'

type Upload = { id: number; title: string; filename: string; createdAt: string }

const addedOn = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: 'Europe/Moscow' })

export function RecentUploads({ files }: { files: Upload[] }) {
  const table = useDataPage(files)
  return <DataTableFrame page={table.page} pageCount={table.pageCount} pageSize={table.pageSize} onPage={table.setPage} onPageSize={table.setPageSize}>
    <Table>
      <colgroup><col className="w-[38%]" /><col className="w-[42%]" /><col className="w-[20%]" /></colgroup>
      <TableHeader><TableRow>
        <TableHead className="pl-4">Название</TableHead>
        <TableHead>Файл</TableHead>
        <TableHead className="pr-4 text-right">Добавлен</TableHead>
      </TableRow></TableHeader>
      <TableBody>{table.rows.map(file => <TableRow key={file.id}>
        <TableCell className="pl-4 font-medium"><Link href={`/collections/media/${file.id}`} className="underline-offset-4 hover:underline">{file.title}</Link></TableCell>
        <TableCell className="text-muted-foreground">{file.filename}</TableCell>
        <TableCell className="pr-4 text-right tabular-nums">{addedOn.format(new Date(file.createdAt))}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </DataTableFrame>
}
