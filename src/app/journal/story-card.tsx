import Image from 'next/image'
import Link from 'next/link'
import { IconArrowUpRight, IconClock, IconHeart, IconShare3 } from '@tabler/icons-react'
import { getTopic, articleUrl, formatPublicationDate, type StoryPreview } from './content'
import { topicIcons } from './topic-icons'

export function StoryCard({ story, featured = false, reactions }: {
  story: StoryPreview
  featured?: boolean
  reactions?: { likes: number; shares: number }
}) {
  const topic = getTopic(story.topic)
  const TopicIcon = topic ? topicIcons[topic.slug] : null
  return <article className={featured ? "journal-card journal-card-featured" : "journal-card"}>
    <Link href={articleUrl(story.slug)}>
      <div className="journal-cover"><Image src={story.image} alt={story.alt} fill unoptimized={story.image.startsWith('https://')} sizes={featured ? "(max-width: 759px) 100vw, 50vw" : "(max-width: 569px) 30vw, 252px"} preload={featured} />
        <span className="series-bento__go" aria-hidden="true"><IconArrowUpRight size={18} stroke={2} /></span>
      </div>
      <div className="journal-card-copy">
        {topic && TopicIcon && <span className="journal-label"><TopicIcon size={14} stroke={1.8} aria-hidden /><span>{topic.title}</span></span>}
        <h2>{story.title}</h2>
        <p>{story.description}</p>
        <div className="journal-read">
          <time dateTime={story.publishedAt}>{formatPublicationDate(story.publishedAt)}</time>
          {story.format === 'video'
            ? <span className="journal-duration">Видео</span>
            : <span className="journal-duration"><IconClock size={16} aria-hidden /> {story.minutes} мин чтения</span>}
          <span className="journal-card-reactions">
            <span aria-label={`Лайки: ${reactions?.likes ?? 0}`}><IconHeart size={17} stroke={1.6} aria-hidden />{reactions?.likes ?? 0}</span>
            <span aria-label={`Репосты: ${reactions?.shares ?? 0}`}><IconShare3 size={17} stroke={1.6} aria-hidden />{reactions?.shares ?? 0}</span>
          </span>
        </div>
      </div>
    </Link>
  </article>
}
