import 'server-only'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { getTopic, type Story, type JournalFeedFilters } from './content'
import legacyRubrics from './legacy-rubrics.json'
import duplicateCovers from './duplicate-covers.json'

const databasePath = join(process.cwd(), '.local', 'journal.sqlite')

type PostRow = {
  slug: string
  topic: string
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

const legacyTopics: Record<string, string> = legacyRubrics

const archiveCoverPairs: Record<string, readonly string[]> = duplicateCovers

function withoutRepeatedCover(row: PostRow) {
  const first = /<img\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/i.exec(row.body_html)
  if (!first || !row.cover) return row.body_html
  const pair = archiveCoverPairs[row.slug]
  if (first[2] !== row.cover && !(pair?.[0] === row.cover && pair[1] === first[2])) return row.body_html

  const before = row.body_html.slice(0, first.index)
  const after = row.body_html.slice(first.index + first[0].length)
  if (/<figure\b[^>]*>\s*$/i.test(before) && /^\s*<\/figure>/i.test(after)) {
    return before.replace(/<figure\b[^>]*>\s*$/i, '') + after.replace(/^\s*<\/figure>/i, '')
  }
  return before + after
}

function storyFromRow(row: PostRow): Story {
  return {
      slug: row.slug,
      topic: getTopic(row.topic === 'articles' ? legacyTopics[row.slug] ?? null : row.topic)?.slug ?? null,
      format: row.format,
      title: row.title,
      description: row.description,
      publishedAt: row.published_at,
      image: row.cover || '/media/reviews/review-barn.jpg',
      alt: '',
      bodyHtml: withoutRepeatedCover(row),
      bodyText: row.body_text,
      videoUrl: row.video_url,
      tags: JSON.parse(row.tags) as string[],
  }
}

function readPosts(slug?: string): Story[] {
  if (!existsSync(databasePath)) return []
  const db = new DatabaseSync(databasePath, { readOnly: true })
  try {
    const query = slug
      ? db.prepare('SELECT * FROM journal_posts WHERE slug = ?')
      : db.prepare("SELECT slug, topic, format, title, description, published_at, cover, '' AS body_html, body_text, video_url, tags FROM journal_posts ORDER BY published_at DESC, slug")
    const rows = (slug ? query.all(slug) : query.all()) as unknown as PostRow[]
    return rows.map(storyFromRow)
  } finally {
    db.close()
  }
}

export const listJournalPosts = () => readPosts()
export const getJournalPost = (slug: string) => readPosts(slug)[0]

const pageSize = 12

export function readJournalPage(filters: JournalFeedFilters, after?: string) {
  const empty = { items: [], next: null }
  if (!existsSync(databasePath)) return empty
  const db = new DatabaseSync(databasePath, { readOnly: true })
  try {
    const where: string[] = []
    const values: (number | string)[] = []
    if (filters.topic) {
      const aliases = Object.keys(legacyTopics).filter(slug => legacyTopics[slug] === filters.topic)
      where.push(aliases.length ? `(topic = ? OR (topic = 'articles' AND slug IN (${aliases.map(() => '?').join(', ')})))` : 'topic = ?')
      values.push(filters.topic, ...aliases)
    }
    if (filters.videoOnly) where.push("(format = 'video' OR video_url <> '')")
    if (filters.query) {
      db.function('journal_lower', value => String(value ?? '').toLocaleLowerCase('ru'))
      where.push("instr(journal_lower(title || ' ' || description || ' ' || body_text || ' ' || tags), ?) > 0")
      values.push(filters.query)
    }
    if (after) {
      const cursor = db.prepare('SELECT published_at FROM journal_posts WHERE slug = ?').get(after)
      if (typeof cursor?.published_at !== 'string') return empty
      where.push('(published_at < ? OR (published_at = ? AND slug > ?))')
      values.push(cursor.published_at, cursor.published_at, after)
    }
    const rows = db.prepare(`
      SELECT slug, topic, format, title, description, published_at, cover, '' AS body_html, body_text, video_url, tags
      FROM journal_posts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY published_at DESC, slug LIMIT ?
    `).all(...values, pageSize + 1) as unknown as PostRow[]
    const items = rows.slice(0, pageSize).map(storyFromRow)
    return { items, next: rows.length > pageSize ? items.at(-1)?.slug ?? null : null }
  } finally {
    db.close()
  }
}
