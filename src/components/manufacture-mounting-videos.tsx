"use client";

import { useState } from "react";
import { VideoLightbox, vkEmbed } from "./video-lightbox";

const episodes = [
  {
    id: "456242307",
    hash: "325f30cd4c6157ff94",
    poster: "https://sun9-29.userapi.com/impg/ksRmpFSE5LBvpoq2YwbMOsfemP-4Qnp31SwQJw/_WXhIWn4Oek.jpg?size=800x450&quality=95&keep_aspect_ratio=1&background=000000&sign=bfb1412a4555790f9193100e0e1ce5c0&c_uniq_tag=gbklewjN9L7SQqejSlKne3z0wNi_uwxbnpijxwvCkWM&type=video_thumb",
  },
  {
    id: "456242321",
    hash: "13aaf495b1fa7f418a",
    poster: "https://sun9-70.userapi.com/impg/U6EC0oC3vLSz4OPatT8CnId2kUL9CBu-8QSSxA/eq3-ZLM92nk.jpg?size=800x450&quality=95&keep_aspect_ratio=1&background=000000&sign=4ff27f8e25c9fa9b0384a3b3bce1bd76&c_uniq_tag=x-n9PMqaTQ1ATMPO1ryqMkMxub5-qtp5ULdBktJHXW4&type=video_thumb",
  },
];

export function ManufactureMountingVideos() {
  const [active, setActive] = useState<number | null>(null);
  const selected = active !== null ? episodes[active] : undefined;

  return (
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
              {/* VK supplies the poster; no image proxy or third-party player before click. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={episode.poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
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
  );
}
