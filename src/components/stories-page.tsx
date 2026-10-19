'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image, { type ImageLoader } from 'next/image'
import { IconArrowUpRight, IconCalendar, IconClock, IconMapPin, IconPlayerPlayFilled } from '@tabler/icons-react'
import { CMSContentBlock } from './cms-content'
import { PageHero } from './page-hero'
import heroImage from '../../public/img/pages/storieshero.png'
import { VideoLightbox, reviewEmbedSrc } from './video-lightbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { nbspText } from '../lib/copy'
import { optimizedSrc } from '../lib/media'
import type { PublicStory } from '../lib/stories'
import styles from './stories-page.module.css'

type Kind = 'all' | 'family' | 'business'
type CatalogMark = 'discontinued' | 'individual'
type Story = PublicStory

const catalogMarkLabel: Record<CatalogMark, string> = {
  discontinued: 'Снят с производства',
  individual: 'Индивидуальный проект',
}

type PreviewStory = {
  slug: string
  heading: string
  title: string
  detail: string
  family: string
  place: string
  year: number
  kind: Exclude<Kind, 'all'>
  catalogMark: CatalogMark | null
  poster: string
  duration: string
  id: string
}

function isPreviewStory(value: unknown): value is PreviewStory {
  if (!value || typeof value !== 'object') return false
  const story = value as PreviewStory
  return typeof story.slug === 'string' && typeof story.heading === 'string'
    && typeof story.place === 'string' && typeof story.year === 'number' && (story.kind === 'family' || story.kind === 'business')
    && typeof story.poster === 'string' && typeof story.duration === 'string'
}

function toFeedStory(draft: PreviewStory): Story {
  return {
    slug: draft.slug,
    heading: draft.heading,
    subtitle: draft.family || draft.detail || '',
    place: draft.place,
    year: draft.year,
    kind: draft.kind,
    binding: draft.catalogMark || 'catalog',
    duration: draft.duration,
    poster: draft.poster,
    video: draft.id && !draft.id.startsWith('draft:') ? { provider: 'kinescope', id: draft.id } : null,
    project: draft.catalogMark ? null : (draft.title ? { slug: draft.slug, name: draft.title, href: '/catalog', image: draft.poster } : null),
  }
}

const years = Array.from({ length: 2026 - 2014 + 1 }, (_, index) => 2026 - index)
const pageSize = 3
const imageLoader: ImageLoader = ({ src, width, quality }) => optimizedSrc(src, width, quality ?? 75)

function StoryVideo({ story, onClose }: { story: Story; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const root = container.current
    root?.querySelector<HTMLButtonElement>('button')?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = Array.from(root?.querySelectorAll<HTMLElement>('button, a[href], iframe, [tabindex="0"]') ?? []).filter(el => el.getClientRects().length)
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); previous?.focus() }
  }, [])
  if (!story.video) return null
  return <div ref={container}><VideoLightbox title={story.heading} embedSrc={reviewEmbedSrc(story.video)} onClose={onClose} /></div>
}

function StoryEntry({ story, onPlay }: { story: Story; onPlay: (story: Story) => void }) {
  const mark = story.binding === 'individual' || story.binding === 'discontinued' ? story.binding : null
  const project = story.project
  const inCatalog = !mark && Boolean(project)
  const projectHref = inCatalog && project ? project.href : (story.kind === 'business' ? '/business' : '/catalog?tech=modular')
  const projectLabel = inCatalog && project ? 'Посмотреть проект' : (story.kind === 'business' ? 'Решения для бизнеса' : 'Модульные проекты')
  const projectTitle = project?.name || story.heading
  const projectDetail = story.subtitle
  return <CMSContentBlock cmsBlockKey={`StoriesEntry-${story.slug}`}>
    <article className={styles.entry} id={`story-${story.slug}`} aria-label={story.heading}>
      <button type="button" className={styles.poster} onClick={() => onPlay(story)} aria-label={`Смотреть видео: ${story.heading}`} disabled={!story.video}>
        {story.poster ? <Image loader={imageLoader} src={story.poster} sizes="(max-width: 800px) calc(100vw - 48px), (max-width: 1200px) 60vw, 760px" alt="" width={744} height={465} loading="lazy" /> : <span className={styles.poster} />}
        {story.duration ? <span className={styles.posterMeta}><span><IconClock aria-hidden="true" />{story.duration}</span></span> : null}
        <span className={styles.play} aria-hidden="true"><IconPlayerPlayFilled /></span>
      </button>
      <div className={styles.side}>
        <span className={styles.kind}>{story.kind === 'business' ? 'Бизнес' : 'Частное лицо'}</span>
        <h3>{nbspText(story.heading)}</h3>
        {story.subtitle ? <p className={styles.lead}>{nbspText(story.subtitle)}</p> : null}
        <ul className={styles.facts}>
          <li><IconMapPin size={18} stroke={1.75} aria-hidden="true" /><span>{story.place}</span></li>
          <li><IconCalendar size={18} stroke={1.75} aria-hidden="true" /><span>{story.year} год</span></li>
        </ul>
        <div className={styles.project}>
          {mark ? <span className={styles.mark}>{catalogMarkLabel[mark]}</span> : null}
          <div className={styles.projectTop}>
            <div>
              <h3>{projectTitle}</h3>
              {projectDetail ? <p>{projectDetail}</p> : null}
            </div>
            {(project?.image || story.poster) ? <Image loader={imageLoader} src={project?.image || story.poster} alt={projectTitle} width={112} height={80} loading="lazy" /> : null}
          </div>
          <Link className="section__link" href={projectHref}>{projectLabel}<IconArrowUpRight aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  </CMSContentBlock>
}

export function StoriesContent({ stories }: { stories: Story[] }) {
  const [kind, setKind] = useState<Kind>('all')
  const defaultYear = stories.length ? Math.max(...stories.map(story => story.year)) : years[0]!
  const [activeYear, setActiveYear] = useState(defaultYear)
  const [limit, setLimit] = useState(pageSize)
  const [activeVideo, setActiveVideo] = useState<Story | null>(null)
  const [draft, setDraft] = useState<Story | null>(null)
  const closeVideo = useCallback(() => setActiveVideo(null), [])
  const feed = draft ? [draft, ...stories.filter(story => story.slug !== draft.slug)] : stories
  const byKind = feed.filter(story => kind === 'all' || story.kind === kind)
  const inYear = byKind.filter(story => story.year === activeYear)
  const visible = inYear.slice(0, limit)
  const hasMore = inYear.length > limit
  const selectYear = (year: number) => {
    setActiveYear(year)
    setLimit(pageSize)
  }
  const selectKind = (next: Kind) => {
    setKind(next)
    setLimit(pageSize)
    const nextStories = feed.filter(story => next === 'all' || story.kind === next)
    if (nextStories.some(story => story.year === activeYear)) return
    const fallback = years.find(year => nextStories.some(story => story.year === year))
    if (fallback) setActiveYear(fallback)
  }

  useEffect(() => {
    const reveal = () => {
      const list = draft ? [draft, ...stories.filter(story => story.slug !== draft.slug)] : stories
      const story = list.find(item => window.location.hash === `#story-${item.slug}`)
      if (!story) return
      setKind('all')
      setActiveYear(story.year)
      const index = list.filter(item => item.year === story.year).findIndex(item => item.slug === story.slug)
      setLimit(Math.max(pageSize, index + 1))
      requestAnimationFrame(() => document.getElementById(`story-${story.slug}`)?.scrollIntoView({ block: 'start' }))
    }
    reveal()
    window.addEventListener('hashchange', reveal)
    return () => window.removeEventListener('hashchange', reveal)
  }, [draft, stories])

  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return
    const allowed = new Set(['http://localhost:3001', 'http://127.0.0.1:3001', 'https://cms.avgst.ru'])
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== 'avgst:preview-story' || !isPreviewStory(event.data.story)) return
      const next = toFeedStory(event.data.story)
      setDraft(next)
      setKind('all')
      setActiveYear(next.year)
      setLimit(pageSize)
      requestAnimationFrame(() => document.getElementById(`story-${next.slug}`)?.scrollIntoView({ block: 'start' }))
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])

  return <>
    <PageHero
      headingId="stories-title"
      title={<><span className="page-hero__accent">Отзывы о нас</span> и о домах</>}
      description={nbspText('Реальные истории семей и владельцев бизнеса. О выборе проекта, строительстве и жизни в доме.')}
      image={heroImage}
      imageAlt="Кресло с жёлтым пледом, столик с книгой и чашкой и комнатное растение"
      actions={<button type="button" className="btn btn-yellow" onClick={() => document.getElementById('stories')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}>Смотреть истории<IconArrowUpRight size={18} stroke={2} aria-hidden="true" /></button>}
    />
    <section id="stories" className={`section section--muted ${styles.feedSection}`} aria-label="Истории владельцев"><div className="section__inner">
      <div className={`about-timeline__heading ${styles.timelineHead}`}>
        <h2 id="stories-years-title"><span className="about-timeline__title">Истории</span> <span className="about-timeline__year" aria-live="polite">{activeYear}</span></h2>
        <div className={styles.timelineTools}>
          <div className={styles.filter}><Select value={kind} onValueChange={value => selectKind(value as Kind)}><SelectTrigger id="story-kind" className={styles.select} aria-label="Тип историй"><SelectValue>{kind === 'family' ? 'Частные лица' : kind === 'business' ? 'Бизнес' : 'Все истории'}</SelectValue></SelectTrigger><SelectContent className={styles.selectContent}><SelectItem value="all">Все истории</SelectItem><SelectItem value="family">Частные лица</SelectItem><SelectItem value="business">Бизнес</SelectItem></SelectContent></Select></div>
        </div>
      </div>
      <nav className={`about-timeline__scale ${styles.yearScale}`} aria-label="Год заселения или запуска">
        {years.map(year => {
          const empty = !byKind.some(story => story.year === year)
          return <button key={year} type="button" disabled={empty} aria-current={activeYear === year ? 'date' : undefined} onClick={() => selectYear(year)}><span className="about-timeline__tick" aria-hidden /><span>{year}</span></button>
        })}
      </nav>
      <div className={styles.visuallyHidden} role="status">Показано: {visible.length} из {feed.length}</div>
      <div className={styles.feed}>{visible.map(story => <StoryEntry key={story.slug} story={story} onPlay={setActiveVideo} />)}</div>
      {hasMore ? <button type="button" className={styles.more} onClick={() => setLimit(current => current + pageSize)}>Показать больше историй</button> : null}
      {!feed.length ? <p className={styles.lead}>Пока нет опубликованных отзывов.</p> : null}
    </div></section>
    <section className={`section ${styles.nextSection}`} aria-labelledby="stories-next-title"><CMSContentBlock cmsBlockKey="StoriesNextStep"><div className={`section__inner ${styles.next}`}><div className={styles.nextCopy}><h2 id="stories-next-title">{nbspText('За каждой историей - дом, который когда-то был мечтой')}</h2><p>{nbspText('Посмотрите проекты, выберите планировку и приезжайте на выставочную площадку. Увидеть будущий дом своими глазами - хороший следующий шаг.')}</p><div className={styles.nextActions}><Link className="btn btn-yellow" href="/catalog">Посмотреть проекты<IconArrowUpRight aria-hidden="true" /></Link><Link className={styles.secondaryLink} href="/exposition">Выставочные площадки</Link></div></div><div className={styles.nextMedia}><Image src={heroImage} alt="Кресло с жёлтым пледом, столик с книгой и чашкой и комнатное растение" sizes="(max-width: 800px) calc(100vw - 96px), 40vw" /></div></div></CMSContentBlock></section>
    {activeVideo && <StoryVideo story={activeVideo} onClose={closeVideo} />}
  </>
}
