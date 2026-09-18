"use client";

import { Fragment, useState } from "react";
import { IconArrowUpRight, IconMapPin } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";
import { VideoLightbox, kinescopeEmbed } from "./video-lightbox";

type Story = (typeof copy.videoTestimonials.stories)[number];

function StoryPlace({ place }: { place: string }) {
  const region = place.match(/^(.*)\s+область$/)?.[1];
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
  );
}

function StoryMeta({ story }: { story: Story }) {
  const family = "family" in story ? story.family : undefined;
  return (
    <span className="video-story__meta">
      {nbspText(story.detail)}
      {family ? (
        <span className="video-story__family">
          {" · "}
          {nbspText(family)}
        </span>
      ) : null}
      {" · "}
      {nbspText(story.note)}
    </span>
  );
}

function StoryCard({
  story,
  featured = false,
  onOpen,
}: {
  story: Story;
  featured?: boolean;
  onOpen: (story: Story) => void;
}) {
  return (
    <button
      type="button"
      className={
        featured ? "video-story video-story--featured" : "video-story"
      }
      onClick={() => onOpen(story)}
    >
      <img src={story.poster} alt="" />
      <span className="video-story__duration">{story.duration}</span>
      <StoryPlace place={story.place} />
      <span className="video-story__play" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width={featured ? 28 : 22}
          height={featured ? 28 : 22}
        >
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="video-story__overlay">
        <span className="video-story__copy">
          <strong>{story.title}</strong>
          {featured && "quote" in story && story.quote ? (
            <q className="video-story__quote">{nbspText(story.quote)}</q>
          ) : null}
          <StoryMeta story={story} />
        </span>
      </span>
    </button>
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
      <div className="section__inner video-stories__inner">
        <div className="video-stories__intro">
          <p className="eyebrow">{data.eyebrow}</p>
          <h2 id="video-stories-title">
            {data.headingLines.map((line, index) => (
              <Fragment key={line}>
                {index > 0 ? " " : null}
                <span className="heading-line">{nbspText(line)}</span>
              </Fragment>
            ))}
          </h2>
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

        <div className="video-stories__stage">
          <StoryCard
            story={featured}
            featured
            onOpen={setActive}
          />
          <div className="video-stories__side">
            {side.map((story) => (
              <StoryCard key={story.id} story={story} onOpen={setActive} />
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
