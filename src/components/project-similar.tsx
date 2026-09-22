"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogProject } from "../lib/catalog/types";
import { ProjectCard } from "./project-card";

export function ProjectSimilar({ projects }: { projects: CatalogProject[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 2);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncControls();
    const observer = new ResizeObserver(syncControls);
    observer.observe(track);
    return () => observer.disconnect();
  }, [syncControls]);

  if (!projects.length) return null;

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({
      left: direction * (card.getBoundingClientRect().width + gap),
      behavior: "smooth",
    });
  };

  return (
    <section
      className="section section--muted project-similar"
      aria-labelledby="project-similar-title"
    >
      <div className="section__inner">
        <div className="project-similar__head">
          <h2 id="project-similar-title">Похожие проекты</h2>
          <div
            className="project-similar__controls"
            aria-label="Прокрутка похожих проектов"
          >
            <button
              type="button"
              aria-label="Предыдущие проекты"
              disabled={!canPrev}
              onClick={() => move(-1)}
            >
              <IconChevronLeft size={16} stroke={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Следующие проекты"
              disabled={!canNext}
              onClick={() => move(1)}
            >
              <IconChevronRight size={16} stroke={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="project-similar__track"
          onScroll={syncControls}
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
