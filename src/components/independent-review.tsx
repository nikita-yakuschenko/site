"use client";

import { Fragment, useState } from "react";
import { IconBuildingFactory2, IconMapPin } from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";
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
  const PlaceIcon =
    current.placeKind === "factory" ? IconBuildingFactory2 : IconMapPin;

  return (
    <section
      className="section independent-review"
      aria-labelledby="independent-review-title"
    >
      <div className="section__inner independent-review__inner">
        <div className="independent-review__stage">
          <div className="independent-review__copy">
            {showEyebrow ? <p className="eyebrow">{data.eyebrow}</p> : null}
            <h2 id="independent-review-title">
              {titleLines.map((line, index) => (
                <Fragment key={line}>
                  {index > 0 ? " " : null}
                  <span className="heading-line">{nbspText(line)}</span>
                </Fragment>
              ))}
            </h2>
            <p className="independent-review__lead">{nbspText(data.lead)}</p>

            <div className="independent-review__channel">
              <img
                className="independent-review__mark"
                src={data.channelPhoto}
                alt=""
                width={80}
                height={80}
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
            onClick={() => setOpen(true)}
            aria-label={`Смотреть: ${current.title}`}
          >
            <img
              src={current.poster}
              alt=""
              style={
                "posterFocus" in current
                  ? { objectPosition: current.posterFocus }
                  : undefined
              }
            />
            <span className="independent-review__place">
              <PlaceIcon size={15} stroke={1.75} aria-hidden="true" />
              <span>{current.place}</span>
            </span>
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
