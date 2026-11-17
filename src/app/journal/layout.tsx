import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { JournalHeader } from './journal-header'
import './journal.css'

export default function JournalLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return <>
    <JournalHeader />
    <main className="journal section">{children}</main>
  </>
}
