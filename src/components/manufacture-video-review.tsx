"use client";

import { useState } from "react";
import { IconBuildingFactory2, IconUser } from "@tabler/icons-react";
import { VideoLightbox, kinescopeEmbed } from "./video-lightbox";

const videos = [
  { title: "Обзор производства", subtitle: "Как создаются наши дома" },
  { title: "Сборка модулей", subtitle: "Видео скоро появится" },
  { title: "Производство ферм", subtitle: "Видео скоро появится" },
  { title: "Покрасочная линия", subtitle: "Видео скоро появится" },
] as const;

export function ManufactureVideoReview() {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current = videos[active];

  return (
    <section className="section independent-review manufacture-video-review" aria-labelledby="manufacture-video-title">
      <div className="section__inner independent-review__inner">
        <div className="independent-review__stage">
          <div className="independent-review__copy">
            <h2 id="manufacture-video-title">Обзор производства</h2>
            <p className="independent-review__lead">Здесь будет короткий рассказ о нашем производстве и о том, что показано в видеороликах.</p>
            <div className="independent-review__channel">
              <span className="manufacture-video-review__avatar" aria-hidden="true"><IconUser size={34} stroke={1.5} /></span>
              <span>
                <strong>Имя Фамилия</strong>
                <em>Должность в компании</em>
                <em className="independent-review__audience">Короткая подпись о герое видео</em>
              </span>
            </div>
          </div>

          <div id="manufacture-video-panel" role="tabpanel" aria-labelledby={`manufacture-video-tab-${active}`}>
            {active === 0 ? (
              <button type="button" className="independent-review__player" onClick={() => setOpen(true)} aria-label="Смотреть обзор производства">
                <img src="/production/factory.jpg" alt="" />
                <span className="independent-review__place"><IconBuildingFactory2 size={15} stroke={1.75} aria-hidden="true" /><span>Производство Авангард Строй</span></span>
                <span className="independent-review__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
              </button>
            ) : (
              <div className="independent-review__player manufacture-video-review__pending">
                <img src="/production/factory.jpg" alt="" />
                <span>Видео скоро появится</span>
              </div>
            )}
          </div>
        </div>

        <div className="independent-review__playlist" role="tablist" aria-label="Видео о производстве">
          {videos.map((video, index) => (
            <button
              key={video.title}
              id={`manufacture-video-tab-${index}`}
              type="button"
              role="tab"
              aria-controls="manufacture-video-panel"
              aria-selected={index === active}
              className={`independent-review__item${index === active ? " is-active" : ""}`}
              onClick={() => setActive(index)}
            >
              <span className="independent-review__num">{String(index + 1).padStart(2, "0")}</span>
              <span className="independent-review__meta"><strong>{video.title}</strong><em>{video.subtitle}</em></span>
            </button>
          ))}
        </div>
      </div>

      {open ? <VideoLightbox title="Обзор производства" embedSrc={kinescopeEmbed("npS4zk5fgxhM7XbFGRkoq7")} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
