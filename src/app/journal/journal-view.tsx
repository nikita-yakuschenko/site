import Image from 'next/image'
import Link from 'next/link'
import { IconArrowRight, IconBook, IconSearch } from '@tabler/icons-react'
import { getTopic, stories, topics, articleUrl, readingMinutes, type Story, type Topic } from './content'

export function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  return <article className={featured ? 'journal-card journal-card-featured' : 'journal-card'}>
    <Link href={articleUrl(story.slug)}>
      <div className="journal-cover"><Image src={story.image} alt={story.alt} fill sizes={featured ? '(max-width: 760px) 100vw, 58vw' : '(max-width: 760px) 100vw, 33vw'} preload={featured} /></div>
      <div className="journal-card-copy">
        <span className="journal-label">{getTopic(story.topic)?.title}</span>
        <h2>{story.title}</h2>
        <p>{story.description}</p>
        <span className="journal-read"><IconBook size={16} aria-hidden /> {readingMinutes(story)} мин чтения <span className="journal-card-arrow"><IconArrowRight size={18} aria-hidden /></span></span>
      </div>
    </Link>
  </article>
}

export function JournalView({ topic, query, page }: { topic?: Topic; query?: string; page: number }) {
  const path = topic ? `/journal/topic/${topic.slug}` : '/journal'
  const needle = query?.trim().slice(0, 100).toLocaleLowerCase('ru')
  const items = stories.filter(story => (!topic || story.topic === topic.slug) && (!needle || `${story.title} ${story.description} ${story.sections.flat().join(' ')}`.toLocaleLowerCase('ru').includes(needle)))
  const isLanding = !topic && !needle && page === 1
  const featured = isLanding && items.length >= 3 ? items[0] : undefined
  const pageSize = 6
  const remaining = isLanding ? items.slice(3) : items.slice((page - 1) * pageSize, page * pageSize)
  const pageHref = (next: number) => {
    const params = new URLSearchParams()
    if (next > 1) params.set('page', String(next))
    if (query) params.set('q', query)
    return params.size ? `${path}?${params}` : path
  }
  return <>
    {topic && <nav className="journal-crumb" aria-label="Хлебные крошки"><Link href="/journal">Журнал</Link><span>{topic.title}</span></nav>}
    <header className="journal-intro">
      <h1>{topic?.title ?? 'Журнал о строительстве и загородной жизни'}</h1>
      <p>{topic?.description ?? 'Практические материалы о выборе проекта, строительстве дома и жизни за городом.'}</p>
    </header>
    <form className="journal-search" action={path} role="search">
      <IconSearch size={20} aria-hidden />
      <input type="search" name="q" aria-label="Поиск по журналу" placeholder="Найти статью, например, об отоплении" defaultValue={query} maxLength={100} />
      <button type="submit">Найти</button>
    </form>
    <nav className="journal-topics" aria-label="Темы журнала">
      <Link href="/journal" aria-current={!topic ? 'page' : undefined}>Все материалы</Link>
      {topics.map(item => <Link key={item.slug} href={`/journal/topic/${item.slug}`} aria-current={topic?.slug === item.slug ? 'page' : undefined}>{item.title}</Link>)}
    </nav>
    {featured && <section className="journal-featured" aria-label="Выбор редакции">
      <StoryCard story={featured} featured />
      <div className="journal-featured-side">{items.slice(1, 3).map(story => <StoryCard key={story.slug} story={story} />)}</div>
    </section>}
    <section className="journal-list">
      <h2>{needle ? 'Результаты поиска' : isLanding ? 'Свежие материалы' : 'Материалы по теме'}</h2>
      {remaining.length ? <div className="journal-grid">{remaining.map(story => <StoryCard key={story.slug} story={story} />)}</div> : <p>{needle ? 'По этому запросу ничего не найдено.' : 'В этой подборке пока нет материалов.'}</p>}
      {(page > 1 || (!isLanding && page * pageSize < items.length)) && <nav className="journal-topics" aria-label="Страницы материалов">
        {page > 1 && <Link href={pageHref(page - 1)}>Предыдущая страница</Link>}
        {page * pageSize < items.length && <Link href={pageHref(page + 1)}>Следующая страница</Link>}
      </nav>}
    </section>
    <section className="journal-product">
      <div><h2>Подберите проект дома под ваш участок</h2><p>Сравните площади, планировки и технологии в каталоге «Авангард Строй».</p><Link href="/catalog">Открыть каталог <IconArrowRight size={18} aria-hidden /></Link></div>
      <div className="journal-cover"><Image src="/fixtures/house-6.jpg" alt="Загородный дом с крытой террасой" fill sizes="(max-width: 760px) 100vw, 40vw" /></div>
    </section>
  </>
}
