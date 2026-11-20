import { notFound, redirect } from 'next/navigation'
import { getTopic } from '../../content'
import { JournalView } from '../../journal-view'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const topic = getTopic((await params).slug)
  if (!topic) notFound()
  return { title: topic.title, description: topic.description, alternates: { canonical: `/journal/topic/${topic.slug}` }, robots: { index: false, follow: true } }
}

export default async function TopicPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string; format?: string }> }) {
  const topic = getTopic((await params).slug)
  if (!topic) notFound()
  const { q, page, format } = await searchParams
  if (topic.slug === 'news') {
    const query = new URLSearchParams()
    if (q) query.set('q', q)
    if (page) query.set('page', page)
    redirect(query.size ? `/journal?${query}` : '/journal')
  }
  return <JournalView topic={topic} query={typeof q === 'string' ? q : undefined} page={Math.max(1, Number.parseInt(page ?? '', 10) || 1)} videoOnly={topic.slug === 'articles' && format === 'video'} />
}
