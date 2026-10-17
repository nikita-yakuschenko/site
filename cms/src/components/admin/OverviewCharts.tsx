'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart'

const config = {
  views: { label: 'Просмотры', color: 'var(--primary)' },
  leads: { label: 'Заявки', color: 'var(--foreground)' },
} satisfies ChartConfig

export type PopularityRow = { name: string; views: number; leads: number }

export function PopularityChart({ rows }: { rows: PopularityRow[] }) {
  return <ChartContainer config={config} className="aspect-auto h-80 w-full">
    <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
      <CartesianGrid horizontal={false} />
      <YAxis dataKey="name" type="category" width={148} tickLine={false} axisLine={false} tickFormatter={name => name.length > 18 ? `${name.slice(0, 17)}…` : name} />
      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey="views" fill="var(--color-views)" radius={4} />
      <Bar dataKey="leads" fill="var(--color-leads)" radius={4} />
    </BarChart>
  </ChartContainer>
}
