import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { IconArrowRight, IconBook } from '@tabler/icons-react'
import { articleUrl, getTopic, readingMinutes, stories } from '../content'
import { StoryCard } from '../journal-view'
import { ArticleActions } from '../article-actions'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type Props = { params: Promise<{ slug: string }> }

async function getArticle({ params }: Props) {
  const { slug } = await params
  const story = stories.find(item => item.slug === slug)
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
  const related = stories.filter(item => item.slug !== story.slug).sort((a, b) => Number(b.topic === story.topic) - Number(a.topic === story.topic)).slice(0, 3)
  const minutes = readingMinutes(story)
  return <>
    <nav className="journal-crumb" aria-label="Хлебные крошки"><Link href="/journal">Главная</Link>{topic && <Link href={`/journal/topic/${topic.slug}`}>{topic.title}</Link>}<span aria-current="page">{story.title}</span></nav>
    <article>
      <header className="journal-article-hero">
        <div className="journal-article-heading">
          {topic && <Link className="journal-topic-badge" href={`/journal/topic/${topic.slug}`}>{topic.title}</Link>}
          <h1>{story.title}</h1>
          <p>{story.description}</p>
          <p className="journal-byline">Редакция «Авангард Строй» <span><IconBook size={16} aria-hidden /> {minutes} мин чтения</span></p>
          <ArticleActions slug={story.slug} title={story.title} />
        </div>
        <div className="journal-cover"><Image src={story.image} alt={story.alt} fill sizes="(max-width: 760px) 100vw, 50vw" preload /></div>
      </header>
      <div className="journal-reading">
        <aside className="journal-toc">
          <Accordion type="single" collapsible defaultValue="contents">
            <AccordionItem value="contents">
              <AccordionTrigger>В этой статье</AccordionTrigger>
              <AccordionContent>
                <nav aria-label="Оглавление"><ol>{story.sections.map(([heading], index) => <li key={heading}><a href={`#section-${index + 1}`}>{heading}</a></li>)}</ol></nav>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {related.length > 0 && <section className="journal-related-panel">
            <h2>По теме</h2>
            <ul>{related.map(item => <li key={item.slug}><Link href={articleUrl(item.slug)}>
              <div className="journal-cover"><Image src={item.image} alt="" fill sizes="90px" /></div>
              <span>{item.title}</span>
            </Link></li>)}</ul>
          </section>}
        </aside>
        <div className="journal-prose">
          {story.sections.map(([heading, paragraph], index) => <section id={`section-${index + 1}`} key={heading}><h2>{heading}</h2><p>{paragraph}</p></section>)}
          {story.slug === 'otoplenie-doma-zimoy' && <section>
            <h2>Что проверить для каждой системы</h2>
            <div className="journal-table-scroll" tabIndex={0} role="region" aria-label="Сравнение отопления">
              <table className="journal-comparison">
                <thead><tr><th scope="col">Система</th><th scope="col">Что включить в смету</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Электрическое</th><td>Выделенная мощность, тариф, электрика и резерв на случай отключения.</td></tr>
                  <tr><th scope="row">Газовое</th><td>Подключение участка, котёл, дымоход и обслуживание.</td></tr>
                  <tr><th scope="row">Тепловой насос</th><td>Монтаж, режим работы в морозы и источник резервного тепла.</td></tr>
                  <tr><th scope="row">Твердотопливное</th><td>Доставка и хранение топлива, дымоход и регулярный уход.</td></tr>
                </tbody>
              </table>
            </div>
            <p>Запросите расчёт для одного и того же дома и периода. Сравните отдельно стоимость подключения и расходы за отопительный сезон.</p>
          </section>}
          <section className="journal-product journal-article-product"><div><h2>Сравните проекты домов</h2><p>Посмотрите планировки и комплектации в каталоге.</p><Link href="/catalog">Смотреть проекты <IconArrowRight size={18} aria-hidden /></Link></div></section>
        </div>
      </div>
    </article>
    <section className="journal-list"><h2>Читайте также</h2><div className="journal-grid">{related.map(item => <StoryCard story={item} key={item.slug} />)}</div></section>
  </>
}
