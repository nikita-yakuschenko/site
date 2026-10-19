'use client'

import { useState } from 'react'
import { IconBuildingFactory2 } from '@tabler/icons-react'
import { CMSContentBlock, useCMSBlock } from './cms-content'
import type { ContentField } from '../lib/cms/react-content'
import { PersonCard } from './person-card'
import { VideoLightbox, kinescopeEmbed } from './video-lightbox'

const videos = [
  { title: 'Обзор производства', subtitle: 'Как создаются наши дома' },
  { title: 'Сборка модулей', subtitle: 'Видео скоро появится' },
  { title: 'Производство ферм', subtitle: 'Видео скоро появится' },
  { title: 'Покрасочная линия', subtitle: 'Видео скоро появится' },
] as const

const defaults = {
  heading: 'Обзор производства',
  lead: 'Мы собрали серию роликов о том, где, как и из чего мы производим дома, как мы их собираем, упаковываем доставляем на участок и монтируем. Приятного просмотра',
  place: 'Производство Авангард Строй',
  poster: '/production/factory.jpg',
}

function fieldsFor(key: string): ContentField[] {
  return [
    { key: `${key}.content.heading`, kind: 'text', title: 'Заголовок', text: defaults.heading },
    { key: `${key}.content.lead`, kind: 'text', title: 'Описание', text: defaults.lead },
    { key: `${key}.content.poster.image`, kind: 'image', title: 'Обложка видео', image: defaults.poster },
    { key: `${key}.content.place`, kind: 'text', title: 'Подпись на кадре', text: defaults.place },
  ]
}

function partText(parts: { key: string; text?: string }[], key: string, fallback: string) {
  const part = parts.find(item => item.key === key)
  return typeof part?.text === 'string' ? part.text : fallback
}

function partImage(parts: { key: string; image?: string }[], key: string, fallback = '') {
  const part = parts.find(item => item.key === key)
  return typeof part?.image === 'string' ? part.image : fallback
}

export function ManufactureVideoReview() {
  const { key, parts } = useCMSBlock('ManufactureVideoReview')
  const fields = fieldsFor(key)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const heading = partText(parts, `${key}.content.heading`, defaults.heading)
  const lead = partText(parts, `${key}.content.lead`, defaults.lead)
  const poster = partImage(parts, `${key}.content.poster.image`, defaults.poster)
  const place = partText(parts, `${key}.content.place`, defaults.place)

  return (
    <CMSContentBlock cmsBlockKey="ManufactureVideoReview" initialFields={fields}>
      <section className="section independent-review manufacture-video-review" aria-labelledby="manufacture-video-title">
        <div className="section__inner independent-review__inner">
          <div className="independent-review__stage">
            <div className="independent-review__copy">
              <h2 id="manufacture-video-title" data-cms-text={`${key}.content.heading`}>{heading}</h2>
              <p className="independent-review__lead" data-cms-text={`${key}.content.lead`}>{lead}</p>
              <PersonCard data-cms-content-connected cmsBlockKey="Person" />
            </div>

            <div id="manufacture-video-panel" role="tabpanel" aria-labelledby={`manufacture-video-tab-${active}`}>
              {active === 0 ? (
                <button type="button" className="independent-review__player" onClick={() => setOpen(true)} aria-label="Смотреть обзор производства">
                  <img src={poster} alt="" data-cms-image={`${key}.content.poster.image`} />
                  <span className="independent-review__place"><IconBuildingFactory2 size={15} stroke={1.75} aria-hidden="true" /><span data-cms-text={`${key}.content.place`}>{place}</span></span>
                  <span className="independent-review__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
                </button>
              ) : (
                <div className="independent-review__player manufacture-video-review__pending">
                  <img src={poster} alt="" />
                  <span>Видео скоро появится</span>
                </div>
              )}
            </div>
          </div>

          <div className="independent-review__playlist" role="tablist" aria-label="Видео о производстве" data-cms-content-connected="">
            {videos.map((video, index) => (
              <button
                key={video.title}
                id={`manufacture-video-tab-${index}`}
                type="button"
                role="tab"
                aria-controls="manufacture-video-panel"
                aria-selected={index === active}
                className={`independent-review__item${index === active ? ' is-active' : ''}`}
                onClick={() => setActive(index)}
              >
                <span className="independent-review__num">{String(index + 1).padStart(2, '0')}</span>
                <span className="independent-review__meta"><strong>{video.title}</strong><em>{video.subtitle}</em></span>
              </button>
            ))}
          </div>
        </div>

        {open ? <VideoLightbox title={heading || 'Обзор производства'} embedSrc={kinescopeEmbed('npS4zk5fgxhM7XbFGRkoq7')} onClose={() => setOpen(false)} /> : null}
      </section>
    </CMSContentBlock>
  )
}
