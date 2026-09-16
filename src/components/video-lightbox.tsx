"use client";

import { IconX } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import { copy } from "../lib/copy";

/** Модалка с iframe: один хром для обзоров и отзывов. */
export function VideoLightbox({
  title,
  embedSrc,
  onClose,
}: {
  title: string;
  embedSrc: string;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="factory-video__modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="factory-video__overlay">
          <p id={titleId}>{title}</p>
          <button
            type="button"
            className="factory-video__close"
            aria-label={copy.close}
            onClick={onClose}
          >
            <IconX size={20} stroke={2.2} />
          </button>
        </div>
        <iframe
          title={title}
          src={embedSrc}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export function kinescopeEmbed(id: string): string {
  return `https://kinescope.io/embed/${id}?autoplay=1&muted=0`;
}

/** Embed VK Video: oid отрицательный у сообщества, id ролика. */
export function vkEmbed(oid: number, id: string): string {
  return `https://vk.com/video_ext.php?oid=${oid}&id=${id}&hd=2&autoplay=1`;
}

export type ReviewEmbed =
  | { provider: "kinescope"; id: string }
  | { provider: "vk"; oid: number; id: string };

export function reviewEmbedSrc(video: ReviewEmbed): string {
  if (video.provider === "vk") return vkEmbed(video.oid, video.id);
  return kinescopeEmbed(video.id);
}

