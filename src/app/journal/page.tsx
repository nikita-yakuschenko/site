import type { Metadata } from 'next'
import { JournalView } from './journal-view'

export const metadata: Metadata = {
  title: 'Журнал о строительстве и загородной жизни',
  description: 'Практические материалы о выборе проекта, строительстве дома и жизни за городом.',
  alternates: { canonical: '/journal' },
  robots: { index: false, follow: true },
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page } = await searchParams
  return <JournalView query={typeof q === 'string' ? q : undefined} page={Math.max(1, Number.parseInt(page ?? '', 10) || 1)} />
}
