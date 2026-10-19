'use client'

import { CMSContentBlock } from './cms-content'
import { Fragment, useState } from 'react'
import Link from 'next/link'
import { YandexRating } from './yandex-rating'
import { IconArrowUpRight, IconMapPin } from '@tabler/icons-react'
import { copy, nbspText } from '../lib/copy'
import { optimizedSrc } from '../lib/media'
import type { PublicStory } from '../lib/stories'
import { VideoLightbox, reviewEmbedSrc } from './video-lightbox'

function StoryPlace({ place }: { place: string }) {
  const region = place.match(/^(.*)\s+область$/)?.[1]
  return (
    <span className="video-story__place">
      <IconMapPin size={15} stroke={1.75} aria-hidden="true" />
      {region ? (
        <>
          {nbspText(region)}
          <span className="video-story__place-full"> область</span>
          <span className="video-story__place-short"> обл.</span>
        </>
      ) : (
        nbspText(place)
      )}
    </span>
  )
}

function StoryCard({
  story,
  featured = false,
  blockKey,
  onOpen,
}: {
  story: PublicStory
  featured?: boolean
  blockKey: string
  onOpen: (story: PublicStory) => void
}) {
  return (
    <button
      type="button"
      className={featured ? 'video-story video-story--featured' : 'video-story'}
      data-cms-block={blockKey}
      onClick={() => onOpen(story)}
      disabled={!story.video}
    >
      {story.poster ? <img src={optimizedSrc(story.poster, 640, 60)} alt="" loading="lazy" decoding="async" /> : null}
      {story.duration ? <span className="video-story__duration">{story.duration}</span> : null}
      <StoryPlace place={story.place} />
      <span className="video-story__play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width={24} height={24}>
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="video-story__overlay">
        <span className="video-story__copy">
          <strong>{story.heading}</strong>
        </span>
      </span>
    </button>
  )
}

/** Видеоотзывы с CMS: название, длительность, локация. */
export function VideoTestimonials({
  stories,
  showEyebrow = true,
  showAllLink = true,
}: {
  stories: PublicStory[]
  showEyebrow?: boolean
  showAllLink?: boolean
}) {
  const data = copy.videoTestimonials
  const featured = stories[0]
  const side = stories.slice(1, 3)
  const [active, setActive] = useState<PublicStory | null>(null)

  if (!featured) return null

  return (<CMSContentBlock cmsBlockKey="VideoTestimonials">{(
    <section
      className="section section--muted video-stories"
      data-cms-block="videoTestimonials"
      aria-labelledby="video-stories-title"
    >
      <div className="section__inner video-stories__inner">
        <div className="video-stories__intro">
          <div data-cms-block="videoTestimonials.heading">
          {showEyebrow ? <p className="eyebrow">{data.eyebrow}</p> : null}
          <h2 id="video-stories-title">
            {data.headingLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 ? ' ' : null}
                <span className="heading-line">{nbspText(line)}</span>
              </Fragment>
            ))}
          </h2>
          </div>
          <div className="video-stories__rating" data-cms-block="videoTestimonials.rating">
            <YandexRating />
          </div>
          <p className="video-stories__lead" data-cms-block="videoTestimonials.lead">{nbspText(data.lead)}</p>
        </div>

        <div className="video-stories__actions">
          {showAllLink ? <Link href="/stories" className="btn btn-yellow" data-cms-block="videoTestimonials.all">
            Все дома и истории
            <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
          </Link> : null}
        </div>

        <div className="video-stories__stage">
          <StoryCard
            story={featured}
            featured
            blockKey="videoTestimonials.story.0"
            onOpen={setActive}
          />
          <div className="video-stories__side">
            {side.map((story, index) => (
              <StoryCard key={story.slug} story={story} blockKey={`videoTestimonials.story.${index + 1}`} onOpen={setActive} />
            ))}
          </div>
        </div>
      </div>

      {active?.video ? (
        <VideoLightbox
          title={active.heading}
          embedSrc={reviewEmbedSrc(active.video)}
          onClose={() => setActive(null)}
        />
      ) : null}
    </section>
  )}</CMSContentBlock>)
}
