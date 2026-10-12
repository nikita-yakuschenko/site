import type { ReactNode } from 'react'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty'

export function EmptyState({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children?: ReactNode }) {
  return <Empty className="avgst-empty-state shadcn-surface min-h-64">
    <EmptyHeader>
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{description}</EmptyDescription>
    </EmptyHeader>
    {children && <EmptyContent>{children}</EmptyContent>}
  </Empty>
}
