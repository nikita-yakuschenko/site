import Image from 'next/image'
import Link from 'next/link'
import { IconArrowRight, IconClock } from '@tabler/icons-react'
import { getTopic, articleUrl, formatPublicationDate, readingMinutes, type Story, type Topic } from './content'
import { listJournalPosts } from './archive'
import { topicIcons } from './topic-icons'

export function StoryCard({ story, featured = false, feed = false }: { story: Story; featured?: boolean; feed?: boolean }) {
  const topic = getTopic(story.topic)
  const TopicIcon = topicIcons[story.topic]
  return <article className={featured ? 'journal-card journal-card-featured' : 'journal-card'}>
    <Link href={articleUrl(story.slug)}>
      <div className="journal-cover"><Image src={story.image} alt={story.alt} fill unoptimized={story.image.startsWith('https://')} sizes={featured ? '(max-width: 760px) 100vw, 58vw' : feed ? '(max-width: 569px) 30vw, 252px' : '(max-width: 760px) 100vw, 33vw'} preload={featured} /></div>
      <div className="journal-card-copy">
        {topic && <span className="journal-label"><TopicIcon size={14} stroke={1.8} aria-hidden /><span>{topic.title}</span></span>}
        <h2>{story.title}</h2>
        <p>{story.description}</p>
        <div className="journal-read">
          <time dateTime={story.publishedAt}>{formatPublicationDate(story.publishedAt)}</time>
          {story.format === 'video'
            ? <span className="journal-duration">Видео</span>
            : <span className="journal-duration"><IconClock size={16} aria-hidden /> {readingMinutes(story)} мин чтения</span>}
          {!feed && <span className="journal-card-arrow"><IconArrowRight size={18} aria-hidden /></span>}
        </div>
      </div>
    </Link>
  </article>
}

export function JournalView({ topic, query, page, videoOnly = false }: { topic?: Topic; query?: string; page: number; videoOnly?: boolean }) {
  const path = topic ? `/journal/topic/${topic.slug}` : '/journal'
  const needle = query?.trim().slice(0, 100).toLocaleLowerCase('ru')
  const allArticles = topic?.slug === 'articles'
  const items = listJournalPosts().filter(story =>
    (!topic || allArticles || story.topic === topic.slug) &&
    (videoOnly ? Boolean(story.videoUrl) : topic && !allArticles || story.format === 'article') &&
    (!needle || `${story.title} ${story.description} ${story.bodyText} ${story.tags.join(' ')}`.toLocaleLowerCase('ru').includes(needle))
  )
  const isHomeFeed = !topic && !needle
  const featuredCount = isHomeFeed && items.length >= 3 ? 3 : topic && !needle && items.length ? 1 : 0
  const featured = page === 1 && featuredCount ? items[0] : undefined
  const pageSize = 6
  const pageEnd = featuredCount + page * pageSize
  const remaining = items.slice(featuredCount + (page - 1) * pageSize, pageEnd)
  const pageHref = (next: number) => {
    const params = new URLSearchParams()
    if (next > 1) params.set('page', String(next))
    if (query) params.set('q', query)
    if (videoOnly) params.set('format', 'video')
    return params.size ? `${path}?${params}` : path
  }
  return <>
    {topic && <nav className="journal-crumb" aria-label="Хлебные крошки"><Link href="/journal">Главная</Link><span aria-current="page">{topic.title}</span></nav>}
    {topic && <header className="journal-intro"><h1>{topic.title}</h1></header>}
    {allArticles && <nav className="journal-topics" aria-label="Формат публикаций">
      <Link href={path} aria-current={!videoOnly ? 'page' : undefined}>Тексты</Link>
      <Link href={`${path}?format=video`} aria-current={videoOnly ? 'page' : undefined}>Видео</Link>
    </nav>}
    {featured && isHomeFeed && <section className="journal-featured" aria-label="Выбор редакции">
      <StoryCard story={featured} featured />
      <div className="journal-featured-side">{items.slice(1, 3).map(story => <StoryCard key={story.slug} story={story} />)}</div>
    </section>}
    {isHomeFeed && <p className="journal-archive-link"><Link href="/journal/topic/articles">Все статьи и видео <IconArrowRight size={18} aria-hidden /></Link></p>}
    {featured && topic && <section className="journal-topic-featured" aria-label="Последняя публикация">
      <StoryCard story={featured} featured />
    </section>}
    {(!featured || remaining.length > 0) && <section className="journal-list" aria-label={!needle ? 'Статьи журнала' : undefined}>
      {needle && <h2>Результаты поиска</h2>}
      {remaining.length ? <div className={needle ? 'journal-grid' : 'journal-feed'}>{remaining.map(story => <StoryCard key={story.slug} story={story} feed={!needle} />)}</div> : <p>{needle ? 'По этому запросу ничего не найдено.' : 'В этой подборке пока нет материалов.'}</p>}
      {(page > 1 || pageEnd < items.length) && <nav className="journal-topics" aria-label="Страницы материалов">
        {page > 1 && <Link href={pageHref(page - 1)}>Предыдущая страница</Link>}
        {pageEnd < items.length && <Link href={pageHref(page + 1)}>Следующая страница</Link>}
      </nav>}
    </section>}
    <section className="journal-product">
      <div><h2>Подберите проект дома под ваш участок</h2><p>Сравните площади, планировки и технологии в каталоге «Авангард Строй».</p><Link href="/catalog">Открыть каталог <IconArrowRight size={18} aria-hidden /></Link></div>
      <div className="journal-cover"><Image src="/fixtures/house-6.jpg" alt="Загородный дом с крытой террасой" fill sizes="(max-width: 760px) 100vw, 40vw" /></div>
    </section>
  </>
}
