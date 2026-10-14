"use client";

import { Fragment, useState } from "react";
import { PhotoLocationBadge } from "./photo-tile";
import { copy, nbspText } from "../lib/copy";
import { optimizedSrc } from "../lib/media";
import { VideoLightbox, reviewEmbedSrc } from "./video-lightbox";

type ReviewVideo = (typeof copy.independentReview.videos)[number];

/** Независимый обзор: слева рассказ, справа кадр, снизу плейлист. */
export function IndependentReview({
  showEyebrow = true,
  headingLines,
}: {
  showEyebrow?: boolean;
  headingLines?: string[];
}) {
  const data = copy.independentReview;
  const titleLines = headingLines ?? data.headingLines;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const current: ReviewVideo = data.videos[active] ?? data.videos[0];

  return (
    <section
      className="section independent-review"
      data-cms-block="independentReview"
      aria-labelledby="independent-review-title"
    >
      <div className="section__inner independent-review__inner">
        <div className="independent-review__stage">
          <div className="independent-review__copy">
            <div data-cms-block="independentReview.heading">
            {showEyebrow ? <p className="eyebrow">{data.eyebrow}</p> : null}
            <h2 id="independent-review-title">
              {titleLines.map((line, index) => (
                <Fragment key={line}>
                  {index > 0 ? " " : null}
                  <span className="heading-line">{nbspText(line)}</span>
                </Fragment>
              ))}
            </h2>
            </div>
            <p className="independent-review__lead" data-cms-block="independentReview.lead">{nbspText(data.lead)}</p>

            <div className="independent-review__channel" data-cms-block="independentReview.channel">
              <img
                className="independent-review__mark"
                src={optimizedSrc(data.channelPhoto, 256)}
                alt=""
                width={80}
                height={80}
                loading="lazy"
              />
              <span>
                <strong>{data.channelName}</strong>
                <em>{data.channelTagline}</em>
                <em className="independent-review__audience">
                  {data.channelAudience}
                </em>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="independent-review__player"
            data-cms-block="independentReview.player"
            onClick={() => setOpen(true)}
            aria-label={`Смотреть: ${current.title}. ${current.place} ${current.duration}`}
          >
            <img
              src={optimizedSrc(current.poster, 828, 60)}
              alt=""
              loading="lazy"
              decoding="async"
              style={
                "posterFocus" in current
                  ? { objectPosition: current.posterFocus }
                  : undefined
              }
            />
            <PhotoLocationBadge address={current.place} factory={current.placeKind === 'factory'} />
            <span className="independent-review__play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
              </svg>
            </span>
            <span className="independent-review__duration">{current.duration}</span>
          </button>
        </div>

        <div
          className="independent-review__playlist"
          data-cms-block="independentReview.playlist"
          role="tablist"
          aria-label={data.playlistLabel}
        >
          {data.videos.map((video, index) => {
            const selected = index === active;
            return (
              <button
                key={`${video.provider}-${video.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                className={
                  selected
                    ? "independent-review__item is-active"
                    : "independent-review__item"
                }
                data-cms-block={`independentReview.video.${index}`}
                onClick={() => setActive(index)}
              >
                <span className="independent-review__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="independent-review__meta">
                  <strong>{video.title}</strong>
                  <em>{video.subtitle}</em>
                </span>
                <span className="independent-review__time">{video.duration}</span>
              </button>
            );
          })}
        </div>
      </div>

      {open ? (
        <VideoLightbox
          title={current.title}
          embedSrc={reviewEmbedSrc(current)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </section>
  );
}
