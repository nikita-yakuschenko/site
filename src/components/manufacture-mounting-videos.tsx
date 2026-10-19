"use client";
import { CMSContentBlock } from './cms-content'

import { useState } from "react";
import { VideoLightbox, vkEmbed } from "./video-lightbox";

const episodes = [
  {
    id: "456242307",
    hash: "325f30cd4c6157ff94",
    // Обложки лежат у нас: ссылки CDN ВК с подписью со временем отваливаются.
    poster: "/production/mounting-series-1.jpg",
  },
  {
    id: "456242321",
    hash: "13aaf495b1fa7f418a",
    poster: "/production/mounting-series-2.jpg",
  },
];

export function ManufactureMountingVideos() {
  const [active, setActive] = useState<number | null>(null);
  const selected = active !== null ? episodes[active] : undefined;

  // mediaBound: обложки только локальные — в CMS лежат протухшие ссылки CDN ВК.
  return (<CMSContentBlock cmsBlockKey="ManufactureMountingVideos" mediaBound>
    <div className="manufacture-mounting-videos">
      <h3 className="mortgage-rules__title">Посмотрите двухсерийный фильм о&nbsp;том, как перевозится и&nbsp;собирается дом</h3>
      <div className="manufacture-mounting-videos__grid">
        {episodes.map((episode, index) => (
          <div key={episode.id}>
            <p className="manufacture-mounting-videos__caption">Серия {index + 1}</p>
            <button
              type="button"
              className="independent-review__player manufacture-mounting-videos__player"
              aria-label={`Смотреть фильм о перевозке и сборке дома, серия ${index + 1}`}
              onClick={() => setActive(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={episode.poster} alt="" loading="lazy" />
              <span className="independent-review__play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              </span>
            </button>
          </div>
        ))}
      </div>
      {selected && active !== null ? (
        <VideoLightbox
          title={`Перевозка и сборка дома. Серия ${active + 1}`}
          embedSrc={`${vkEmbed(-124869734, selected.id)}&hash=${selected.hash}`}
          onClose={() => setActive(null)}
        />
      ) : null}
    </div>
  </CMSContentBlock>);
}
