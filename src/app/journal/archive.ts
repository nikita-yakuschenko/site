import 'server-only'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Story } from './content'

const databasePath = join(process.cwd(), '.local', 'journal.sqlite')

type PostRow = {
  slug: string
  topic: Story['topic']
  format: Story['format']
  title: string
  description: string
  published_at: string
  cover: string
  body_html: string
  body_text: string
  video_url: string
  tags: string
}

function readPosts(slug?: string): Story[] {
  if (!existsSync(databasePath)) return []
  const db = new DatabaseSync(databasePath, { readOnly: true })
  try {
    const query = slug
      ? db.prepare('SELECT * FROM journal_posts WHERE slug = ?')
      : db.prepare("SELECT slug, topic, format, title, description, published_at, cover, '' AS body_html, body_text, video_url, tags FROM journal_posts ORDER BY published_at DESC, slug")
    const rows = (slug ? query.all(slug) : query.all()) as unknown as PostRow[]
    return rows.map(row => ({
      slug: row.slug,
      topic: row.topic,
      format: row.format,
      title: row.title,
      description: row.description,
      publishedAt: row.published_at,
      image: row.cover || '/media/reviews/review-barn.jpg',
      alt: '',
      bodyHtml: row.body_html,
      bodyText: row.body_text,
      videoUrl: row.video_url,
      tags: JSON.parse(row.tags) as string[],
    }))
  } finally {
    db.close()
  }
}

export const listJournalPosts = () => readPosts()
export const getJournalPost = (slug: string) => readPosts(slug)[0]
