import Image from 'next/image'
import Link from 'next/link'
import { IconArrowRight } from '@tabler/icons-react'
import { type JournalSection } from './content'
import { readJournalFeed } from './feed-data'
import { JournalFeed } from './journal-feed'
import { StoryCard } from './story-card'
import { JournalMortgageBanner } from './journal-inserts'

export async function JournalView({ topic, query, videoOnly = false }: { topic?: JournalSection; query?: string; videoOnly?: boolean }) {
  const needle = query?.trim().slice(0, 100).toLocaleLowerCase('ru')
  const allArticles = topic?.slug === 'articles'
  const filters = { topic: allArticles ? undefined : topic?.slug, query: needle, videoOnly }
  const firstPage = await readJournalFeed(filters)
  const showBanners = !needle && !videoOnly
  const first = showBanners ? firstPage.items[0] : undefined
  const feed = first ? firstPage.items.slice(1) : firstPage.items
  const feedKey = JSON.stringify(filters)
  return <>
    {topic && <nav className="journal-crumb" aria-label="Хлебные крошки"><Link href="/journal">Главная</Link><span aria-current="page">{topic.title}</span></nav>}
    {topic && <header className="journal-intro"><h1>{topic.title}</h1></header>}
    <section className="journal-list" aria-label={!needle ? 'Публикации журнала' : undefined}>
      {needle && <h2>Результаты поиска</h2>}
      {first && <>
        {allArticles
          ? <div className="journal-feed"><StoryCard story={first.story} reactions={first.reactions} /></div>
          : <StoryCard story={first.story} featured reactions={first.reactions} />}
        <div className="journal-feed-main-banner"><JournalMortgageBanner /></div>
      </>}
      {feed.length > 0 && <JournalFeed key={feedKey} filters={filters} offerOffset={first ? 1 : undefined} firstPage={{ items: feed, next: firstPage.next }} />}
      {!firstPage.items.length && <p>{needle ? 'По этому запросу ничего не найдено.' : 'В этой подборке пока нет материалов.'}</p>}
    </section>
    <section className="journal-product">
      <div><h2>Подберите проект дома под ваш участок</h2><p>Сравните площади, планировки и технологии в каталоге «Авангард Строй».</p><Link href="/catalog">Открыть каталог <IconArrowRight size={18} aria-hidden /></Link></div>
      <div className="journal-cover"><Image src="/fixtures/house-6.jpg" alt="Загородный дом с крытой террасой" fill sizes="(max-width: 760px) 100vw, 40vw" /></div>
    </section>
  </>
}
