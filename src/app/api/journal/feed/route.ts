import { getTopic } from '@/app/journal/content'
import { readJournalFeed } from '@/app/journal/feed-data'

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 })
  const params = new URL(request.url).searchParams
  const topic = params.get('topic')
  const after = params.get('after')
  if ((topic && !getTopic(topic)) || (after && !/^[a-z0-9-]{1,180}$/.test(after))) {
    return new Response(null, { status: 400 })
  }
  const query = params.get('q')?.trim().slice(0, 100).toLocaleLowerCase('ru')
  const page = await readJournalFeed({ topic: topic || undefined, query, videoOnly: params.get('format') === 'video' }, after || undefined)
  return Response.json(page, { headers: { 'Cache-Control': 'no-store' } })
}
