import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowRight, IconClock } from '@tabler/icons-react'
import { articleUrl, formatPublicationDate, getTopic, readingMinutes } from '../content'
import { topicIcons } from '../topic-icons'
import { StoryCard } from '../journal-view'
import { ArticleActions } from '../article-actions'
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
  const TopicIcon = topicIcons[story.topic]
  const related = listJournalPosts().filter(item => item.slug !== story.slug).sort((a, b) => Number(b.topic === story.topic) - Number(a.topic === story.topic)).slice(0, 3)
  const minutes = readingMinutes(story)
  return <>
    <nav className="journal-crumb" aria-label="Хлебные крошки"><Link href="/journal">Главная</Link>{topic && <Link href={`/journal/topic/${topic.slug}`}>{topic.title}</Link>}<span aria-current="page">{story.title}</span></nav>
    <article>
      <header className="journal-article-hero">
        <div className="journal-article-heading">
          {topic && <Link className="journal-topic-badge" href={`/journal/topic/${topic.slug}`}><TopicIcon size={14} stroke={1.8} aria-hidden /><span>{topic.title}</span></Link>}
          <h1>{story.title}</h1>
          {story.description && <p>{story.description}</p>}
          <p className="journal-byline">
            Редакция «Авангард Строй»
            <time dateTime={story.publishedAt}>{formatPublicationDate(story.publishedAt)}</time>
            {story.format === 'video' ? <span>Видео</span> : <span className="journal-duration"><IconClock size={16} aria-hidden /> {minutes} мин чтения</span>}
          </p>
          <ArticleActions slug={story.slug} title={story.title} />
        </div>
        <div className="journal-cover"><Image src={story.image} alt={story.alt} fill unoptimized={story.image.startsWith('https://')} sizes="(max-width: 760px) 100vw, 50vw" preload /></div>
      </header>
      <div className="journal-reading">
        <aside className="journal-toc">
          {related.length > 0 && <section className="journal-related-panel">
            <h2>По теме</h2>
            <ul>{related.map(item => <li key={item.slug}><Link href={articleUrl(item.slug)}>
              <div className="journal-cover"><Image src={item.image} alt="" fill unoptimized={item.image.startsWith('https://')} sizes="90px" /></div>
              <span>{item.title}</span>
            </Link></li>)}</ul>
          </section>}
        </aside>
        <div className="journal-prose">
          {story.videoUrl && <JournalVideo url={story.videoUrl} title={story.title} />}
          {story.bodyHtml && <div className="journal-imported-body" dangerouslySetInnerHTML={{ __html: story.bodyHtml }} />}
          {!!story.tags.length && <ul className="journal-article-tags" aria-label="Темы статьи">
            {story.tags.map(tag => <li key={tag} className="journal-label">{tag}</li>)}
          </ul>}
          <section className="journal-product journal-article-product"><div><h2>Сравните проекты домов</h2><p>Посмотрите планировки и комплектации в каталоге.</p><Link href="/catalog">Смотреть проекты <IconArrowRight size={18} aria-hidden /></Link></div></section>
        </div>
      </div>
    </article>
    <section className="journal-list"><h2>Читайте также</h2><div className="journal-grid">{related.map(item => <StoryCard story={item} key={item.slug} />)}</div></section>
  </>
}

function JournalVideo({ url, title }: { url: string; title: string }) {
  const video = new URL(url)
  const youtubeId = video.hostname === 'youtu.be' && /^\/[\w-]{11}$/.test(video.pathname) ? video.pathname.slice(1) : null
  const rutubeId = video.hostname === 'rutube.ru' ? /^\/video\/([a-f0-9]{32})\/?$/.exec(video.pathname)?.[1] : null
  const src = youtubeId ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : rutubeId ? `https://rutube.ru/play/embed/${rutubeId}` : null
  return <div className="journal-imported-video">
    {src && <iframe src={src} title={title} loading="lazy" allowFullScreen />}
    <a href={url} target="_blank" rel="noopener noreferrer">Смотреть видео на площадке</a>
  </div>
}