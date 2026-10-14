"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { copy } from "../lib/copy";
import { PhotoLightbox } from "./photo-lightbox";
import { VideoLightbox, reviewEmbedSrc } from "./video-lightbox";
import type { CatalogProject } from "../lib/catalog/types";
import { isBuiltItem, type BuiltItem } from '../lib/catalog/project-built-data';
import { isProjectHeroData } from '../lib/catalog/project-hero-data';

/**
 * Построенные дома.
 *
 * Весь раздел выше — рендеры: так дом задуман. Здесь он снят на участке,
 * в своём посёлке и погоде, и именно это отвечает на вопрос «а в жизни
 * он такой же». Поэтому раздел стоит последним перед комплектацией: он
 * закрывает сомнение прямо перед разговором о деньгах.
 *
 * Здесь же видеообзор: он отвечает на тот же вопрос, только подробнее —
 * и потому идёт широким кадром во всю ширину, а не прячется отдельной
 * кнопкой. Снимки под ним лежат лентой: они сняты в разных посёлках, и
 * листать их уместнее, чем раскладывать очередной сеткой — третьей
 * подряд на этой странице.
 *
 * Снимков у проекта может не быть — тогда раздела нет. Подставлять сюда
 * рендеры нельзя: это ровно то, чего раздел не должен делать.
 */
/** Сколько снимков стоит в ряду. Шесть — как у фасадов и интерьеров;
 *  остальное прячется за последней плиткой. */
const STRIP_TILES = 6;

/** Название проекта в заголовке: в превью CMS берётся из черновика главного экрана. */
function ProjectName({ name }: { name: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return;
    const receive = (event: MessageEvent) => {
      if (event.source === window.parent && ['http://localhost:3001', 'https://cms.avgst.ru'].includes(event.origin) && event.data?.type === 'avgst:preview-hero' && isProjectHeroData(event.data.hero)) setDraft(event.data.hero.name.trim() || null);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return <span style={{ color: 'var(--brand-yellow)' }}>{draft ?? name}</span>;
}

export function ProjectBuilt({ project, items }: { project: CatalogProject; items?: BuiltItem[] }) {
  return items ? <ConnectedProjectBuilt project={project} items={items} /> : <LegacyProjectBuilt project={project} />;
}

function ConnectedProjectBuilt({ project, items }: { project: CatalogProject; items: BuiltItem[] }) {
  const [draft, setDraft] = useState<BuiltItem[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [videoOpen, setVideoOpen] = useState<number | null>(null);
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('cmsPreview')) return;
    const receive = (event: MessageEvent) => {
      if (event.source === window.parent && ['http://localhost:3001', 'https://cms.avgst.ru'].includes(event.origin) && event.data?.type === 'avgst:preview-built' && Array.isArray(event.data.items) && event.data.items.every(isBuiltItem)) setDraft(event.data.items);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const entries = draft ?? items;
  const photos = entries.filter((item): item is Extract<BuiltItem, { type: 'photo' }> => item.type === 'photo');
  const lead = entries[0];
  const displayEntries = entries.slice(1);
  const video = videoOpen === null ? null : entries[videoOpen];
  if (!lead) return null;
  return <section className="section" data-cms-block="ProjectBuilt" aria-labelledby="project-built-title"><div className="section__inner">
    <h2 id="project-built-title" data-cms-block="ProjectBuilt.heading">Как <ProjectName name={project.name} /> выглядит в жизни</h2>
    {lead.type === 'photo' ? <BuiltLeadPhoto image={lead.image} caption={lead.caption} onOpen={() => setOpen(0)} /> : <BuiltVideoTile item={lead} main onOpen={() => setVideoOpen(0)} />}
    {displayEntries.length ? <div className="project-strip">
      {displayEntries.map((item, index) => item.type === 'photo' ? <button key={index} type="button" aria-label={item.caption || copy.galleryOpen} onClick={() => setOpen(photos.indexOf(item))}>
        <Image src={item.image} unoptimized={/^https?:\/\//.test(item.image)} alt={item.caption || ''} width={1200} height={675} sizes="(min-width: 900px) 25vw, 60vw" />
      </button> : <BuiltVideoTile key={index} item={item} onOpen={() => setVideoOpen(index + 1)} />)}
    </div> : null}
  </div>
  {video?.type === 'video' ? <VideoLightbox title={video.caption || copy.builtTour} embedSrc={reviewEmbedSrc(video.video)} onClose={() => setVideoOpen(null)} /> : null}
  {open !== null && open < photos.length ? <PhotoLightbox images={photos.map(item => item.image)} labels={photos.map(item => item.caption || '')} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
  </section>;
}

function BuiltVideoTile({ item, main = false, onOpen }: { item: Extract<BuiltItem, { type: 'video' }>; main?: boolean; onOpen: () => void }) {
  return <button type="button" className={main ? 'project-built__stage project-built__tour' : 'project-built__tour'} aria-label={item.caption || copy.builtTour} onClick={onOpen}>
    {item.cover ? <Image src={item.cover} unoptimized={/^https?:\/\//.test(item.cover)} alt="" width={1920} height={824} sizes={main ? '100vw' : '25vw'} /> : <span className="project-built__video-placeholder" aria-hidden="true" />}
    <span className="project-built__play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5 18.5 12 9 17.5z" fill="currentColor" /></svg></span>
    <span className="project-built__tour-label">{item.caption || copy.builtTour}</span>
  </button>;
}

function BuiltLeadPhoto({ image, caption, onOpen }: { image: string; caption?: string; onOpen: () => void }) {
  return <button type="button" className="project-built__stage project-built__photo" aria-label={caption || copy.galleryOpen} onClick={onOpen}>
    <Image src={image} unoptimized={/^https?:\/\//.test(image)} alt={caption || ''} width={1920} height={824} sizes="100vw" />
  </button>;
}

function LegacyProjectBuilt({ project }: { project: CatalogProject }) {
  const shots = project.built ?? [];
  const tour = project.builtTour;
  const [open, setOpen] = useState<number | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  if (!shots.length && !tour) return null;

  const images = shots.map((shot) => shot.image);
  const captions = shots.map((shot) => shot.caption ?? "");
  const offset = tour ? 0 : 1;
  const tiles = shots.slice(offset, offset + STRIP_TILES);
  const rest = shots.length - offset - tiles.length;

  return (
    <section className="section" data-cms-block="ProjectBuilt" aria-labelledby="project-built-title">
      <div className="section__inner">
        <h2 id="project-built-title">
          Как <ProjectName name={project.name} /> выглядит в жизни
        </h2>
        {tour ? (
          <button
            type="button"
            className="project-built__stage project-built__tour"
            onClick={() => setTourOpen(true)}
          >
            <Image
              src={tour.cover}
              alt=""
              width={1920}
              height={824}
              sizes="100vw"
            />
            {/* Треугольник нарисован здесь, а не взят из набора: у значка
                из набора он уже смещён вправо, и вместе с полем у круга
                компенсация шла дважды — знак выглядел сбитым.

                Основание на 9, вершина на 18.5: центр тяжести треугольника
                лежит в трети от основания, то есть ровно в центре круга.
                Именно он, а не рамка знака, должен совпадать с центром. */}
            <span className="project-built__play">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6.5 18.5 12 9 17.5z" fill="currentColor" />
              </svg>
            </span>
            <span className="project-built__tour-label">
              {tour.title ?? copy.builtTour}
            </span>
          </button>
        ) : shots[0] ? <BuiltLeadPhoto image={shots[0].image} caption={shots[0].caption} onOpen={() => setOpen(0)} /> : null}

        {tiles.length ? (
          <div className="project-strip">
            {tiles.map((shot, index) => {
              const last = rest > 0 && index === tiles.length - 1;
              return (
                <button
                  key={shot.image}
                  type="button"
                  className={last ? "project-rows__rest" : undefined}
                  aria-label={
                    last ? `${copy.galleryRest} ${rest}` : copy.galleryOpen
                  }
                  onClick={() => setOpen(index + offset)}
                >
                  <Image
                    src={shot.image}
                    alt=""
                    width={1200}
                    height={675}
                    sizes="(min-width: 900px) 25vw, 60vw"
                  />
                  {last ? (
                    <span>
                      +{rest}
                      <small>{copy.galleryRest}</small>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {tourOpen && tour ? (
        <VideoLightbox
          title={tour.title ?? copy.builtTour}
          embedSrc={reviewEmbedSrc(tour.video)}
          onClose={() => setTourOpen(false)}
        />
      ) : null}

      {open !== null ? (
        <PhotoLightbox
          images={images}
          labels={captions}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}
