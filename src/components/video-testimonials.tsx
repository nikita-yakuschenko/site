"use client";

import { useState } from "react";
import { IconArrowUpRight, IconMapPin } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";
import { VideoLightbox, kinescopeEmbed } from "./video-lightbox";

type Story = (typeof copy.videoTestimonials.stories)[number];

function StoryPlace({ place }: { place: string }) {
  return (
    <span className="video-story__place">
      <IconMapPin size={15} stroke={1.75} aria-hidden="true" />
      {nbspText(place)}
    </span>
  );
}

/** Видеоотзывы: крупная история слева, две компактные справа. */
export function VideoTestimonials() {
  const data = copy.videoTestimonials;
  const featured = data.stories[0];
  const side = data.stories.slice(1);
  const [active, setActive] = useState<Story | null>(null);

  if (!featured) return null;

  return (
    <section
      className="section section--muted video-stories"
      aria-labelledby="video-stories-title"
    >
      <div className="section__inner">
        <div className="section__head video-stories__head">
          <div>
            <p className="eyebrow">{data.eyebrow}</p>
            <h2 id="video-stories-title">{nbspText(data.heading)}</h2>
            <p className="video-stories__lead">{nbspText(data.lead)}</p>
          </div>
          <div className="video-stories__actions">
            <button
              type="button"
              className="btn btn-yellow"
              onClick={() => setActive(featured)}
            >
              {data.watchAllLabel}
              <IconArrowUpRight size={18} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="video-stories__stage">
          <button
            type="button"
            className="video-story video-story--featured"
            onClick={() => setActive(featured)}
          >
            <img src={featured.poster} alt="" />
            <span className="video-story__duration">{featured.duration}</span>
            <StoryPlace place={featured.place} />
            <span className="video-story__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            </span>
            <span className="video-story__overlay">
              <span className="video-story__copy">
                <strong>{featured.title}</strong>
                {"quote" in featured && featured.quote ? (
                  <q className="video-story__quote">{nbspText(featured.quote)}</q>
                ) : null}
                <span className="video-story__meta">{nbspText(featured.meta)}</span>
              </span>
            </span>
          </button>

          <div className="video-stories__side">
            {side.map((story) => (
              <button
                key={story.id}
                type="button"
                className="video-story"
                onClick={() => setActive(story)}
              >
                <img src={story.poster} alt="" />
                <span className="video-story__duration">{story.duration}</span>
                <StoryPlace place={story.place} />
                <span className="video-story__play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                  </svg>
                </span>
                <span className="video-story__overlay">
                  <span className="video-story__copy">
                    <strong>{story.title}</strong>
                    <span className="video-story__meta">{nbspText(story.meta)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {active ? (
        <VideoLightbox
          title={active.title}
          embedSrc={kinescopeEmbed(active.id)}
          onClose={() => setActive(null)}
        />
      ) : null}
    </section>
  );
}
