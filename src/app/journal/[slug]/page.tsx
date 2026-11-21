import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowsDiagonal, IconClock, IconPlayerPlay } from '@tabler/icons-react'
import { formatPublicationDate, getTopic, readingMinutes, storyPreview } from '../content'
import { StoryCard } from '../story-card'
import { ArticleActions } from '../article-actions'
import { getJournalReactions, getJournalReactionTotals } from '../reactions'
import { JournalMedia } from '../journal-media'
import { splitArticleBody } from '../article-body'
import { JournalMortgageBanner, JournalProjectRecommendations } from '../journal-inserts'
import { getJournalPost, listJournalPosts } from '../archive'

type Props = { params: Promise<{ slug: string }> }

async function getArticle({ params }: Props) {
  const { slug } = await params
  const story = getJournalPost(slug)
  if (!story) notFound()
  return story
}

export async function generateMetadata(props: Props) {
  const story = await getArticle(props)
  return { title: story.title, description: story.description, alternates: { canonical: `/journal/${story.slug}` }, robots: { index: false, follow: true }, openGraph: { type: 'article' as const, title: story.title, description: story.description, images: [story.image] } }
}

export default async function ArticlePage(props: Props) {
  const story = await getArticle(props)
  const topic = getTopic(story.topic)
  const related = listJournalPosts().filter(item => item.slug !== story.slug).sort((a, b) => Number(b.topic === story.topic) - Number(a.topic === story.topic)).slice(0, 6)
  const relatedReactions = await getJournalReactionTotals(related.map(item => item.slug))
  const minutes = readingMinutes(story)
  const lead = story.description.trim()
  const body = splitArticleBody(story.bodyHtml)
  return <>
    <nav className="journal-crumb" aria-label="Хлебные крошки">
      <Link href="/journal">Главная</Link>
      {topic && <Link href={`/journal/topic/${topic.slug}`}>{topic.title}</Link>}
      <span aria-current="page">{story.title}</span>
    </nav>
    <JournalMedia cover={story.image} title={story.title}>
      <header className="journal-article-hero">
        <div className="journal-article-heading">
          <h1>{story.title}</h1>
          {lead && <p className="journal-article-lead">{lead}</p>}
          <div className="journal-article-meta">
            <div className="journal-byline">
              <time dateTime={story.publishedAt}>{formatPublicationDate(story.publishedAt)}</time>
              {story.format === 'video' ? <span>Видео</span> : <span className="journal-duration"><IconClock size={16} aria-hidden /> {minutes} мин чтения</span>}
            </div>
          </div>
        </div>
        <button type="button" className="journal-cover journal-article-cover" data-journal-cover aria-label="Открыть обложку">
          <Image src={story.image} alt={story.alt} fill unoptimized={story.image.startsWith('https://')} sizes="(width < 1000px) calc(100vw - 32px), (width < 1192px) calc((100vw - 32px) * 2 / 3), 774px" preload />
          <span className="journal-cover-expand"><IconArrowsDiagonal size={20} aria-hidden /></span>
        </button>
      </header>
      <div className="journal-prose">
        {body.intro && <div className="journal-imported-body" data-article-part="intro" dangerouslySetInnerHTML={{ __html: body.intro }} />}
        <JournalMortgageBanner />
        {story.videoUrl && <a className="journal-video-link" data-journal-video href={story.videoUrl}><IconPlayerPlay size={20} aria-hidden /> Смотреть видео</a>}
        {body.main && <div className="journal-imported-body" data-article-part="main" dangerouslySetInnerHTML={{ __html: body.main }} />}
        <JournalProjectRecommendations story={story} />
        {body.conclusion && <div className="journal-imported-body" data-article-part="conclusion" dangerouslySetInnerHTML={{ __html: body.conclusion }} />}
        {body.faq && <div className="journal-imported-body" data-article-part="faq" dangerouslySetInnerHTML={{ __html: body.faq }} />}
        {!!story.tags.length && <ul className="journal-article-tags" aria-label="Темы статьи">
          {story.tags.map(tag => <li key={tag} className="journal-label">{tag}</li>)}
        </ul>}
        <footer className="journal-article-actions" aria-labelledby="journal-article-actions-title">
          <h2 id="journal-article-actions-title">Понравилась статья?</h2>
          <ArticleActions key={story.slug} slug={story.slug} title={story.title} initial={await getJournalReactions(story.slug)} />
        </footer>
      </div>
    </JournalMedia>
    {related.length > 0 && <section className="journal-list journal-article-related" aria-labelledby="journal-related-heading">
      <h2 id="journal-related-heading">Читайте также</h2>
      <div className="journal-feed">{related.map(item => <StoryCard story={storyPreview(item)} key={item.slug} reactions={relatedReactions[item.slug]} />)}</div>
    </section>}
  </>
}
