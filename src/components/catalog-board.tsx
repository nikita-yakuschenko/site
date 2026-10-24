"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CatalogFilters, CatalogSort } from "./catalog-filters";
import { CatalogSearch } from "./catalog-search";
import * as Popover from "@radix-ui/react-popover";
import {
  countActive,
  filtersToHref,
  normalizeQuery,
  type CatalogFacets,
} from "../lib/catalog/filters";
import type { CatalogFilters as Filters } from "../lib/catalog/types";
import {
  readFavorites,
  readServerFavorites,
  subscribeFavorites,
} from "../lib/favorites";
import { IconFilter } from "@tabler/icons-react";
import { sortCatalog, type SortableProject } from "../lib/catalog/order";
import { useRegionCode } from "./region-bootstrap";
import { copy } from "../lib/copy";

/**
 * Каталог: колонка отбора слева, выдача справа.
 *
 * Карточки приходят готовыми с сервера и здесь только раскладываются:
 * ProjectCard остаётся серверным, а этому слою нужно лишь решать, что
 * показать.
 *
 * Выдача делится надвое. Сверху подходящие под отбор, ниже, за рубежом, весь
 * остальной каталог по близости к выбору. Экран не пустеет никогда, даже
 * когда под условия не подошло ничего.
 *
 * Избранное намеренно не попадает в адрес. Оно лежит в localStorage и
 * приватно для браузера: ссылка вида ?favorites=1 показывала бы каждому свой
 * набор, то есть врала бы. Поэтому это переключатель вида, а не условие
 * отбора, и работает он поверх уже отобранного.
 */


export type BoardItem = SortableProject & { card: ReactNode };


export function CatalogBoard({
  filters,
  facets,
  matched,
  rest,
  picked,
}: {
  filters: Filters;
  facets: CatalogFacets;
  matched: BoardItem[];
  rest: BoardItem[];
  picked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  /* Раскрытие колонки на узком экране. Живёт здесь, потому что кнопка стоит
     в полосе поиска, а сама колонка ниже. */
  const [open, setOpen] = useState(false);
  useEffect(() => () => {
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
  }, []);
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    readServerFavorites,
  );

  const keep = (items: BoardItem[]) =>
    onlyFavorites ? items.filter((item) => favorites.includes(item.id)) : items;

  const region = useRegionCode();
  const shownMatched = sortCatalog(keep(matched), filters.sort, region);
  const shownRest = keep(rest);
  const narrowed = picked || onlyFavorites;

  /* Растворение под полосой нужно только когда она закреплена. В покое оно
     висело поверх верхнего края карточек и колонки и подмывало их.
     Прилипание считаем по самой полосе: её верх упёрся в край экрана,
     значит она встала. */
  const bar = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sidebar.current;
    if (!node) return;
    const measure = () => node.style.setProperty('--catalog-filter-height', `${node.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = bar.current;
    if (!node) return;
    const update = () => {
      setStuck(node.getBoundingClientRect().top <= Number.parseFloat(getComputedStyle(node).top));
    };
    const first = requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  /* Избранное считается наравне с условиями отбора: для человека это такое
     же сужение выдачи, просто хранится не в адресе. */
  const active = countActive(filters) + (filters.sort ? 1 : 0) + (onlyFavorites ? 1 : 0);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  /* Условия поменялись, значит список стал другим, и оставаться на прежней
     высоте бессмысленно: под курсором окажутся чужие карточки. Возвращаемся
     к началу выдачи, а не страницы: полоса поиска и колонка отбора должны
     остаться на месте, чтобы можно было сразу поправить условие.

     Вверх и только вверх: если человек и так в начале, дёргать экран не за
     чем. Переход мгновенный, без плавности: список под рукой уже другой, и
     смотреть, как мимо пролетают чужие карточки, незачем. */
  const backToStart = () => {
    const node = results.current;
    if (!node) return;
    if (open) return;
    const barHeight = Number.parseInt(
      getComputedStyle(node).getPropertyValue("--catalog-bar"),
      10,
    );
    const barTop = bar.current ? Number.parseFloat(getComputedStyle(bar.current).top) || 0 : 0;
    const resultsMargin = Number.parseFloat(getComputedStyle(node).marginTop) || 0;
    const target = window.scrollY + node.getBoundingClientRect().top - (barHeight || 0) - resultsMargin - barTop;
    if (window.scrollY <= target) return;
    window.scrollTo({ top: target, behavior: "auto" });
  };

  const search = (raw: string) => {
    const q = normalizeQuery(raw);
    router.replace(filtersToHref({ ...filters, q: q || undefined }, pathname), { scroll: false });
    backToStart();
  };

  const reset = () => {
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    setOnlyFavorites(false);
    router.replace(pathname, { scroll: false });
    backToStart();
  };

  const renderFilters = (mobile = false) => (
    <CatalogFilters
        mobile={mobile}
        onReset={reset}
        hasActiveFilters={!!active}
        filters={filters}
        facets={facets}
        onlyFavorites={onlyFavorites}
        favoritesCount={favorites.length}
        onToggleFavorites={() => {
          setOnlyFavorites((value) => !value);
          backToStart();
        }}
        open={mobile}
        onApply={() => {
          setOpen(false);
        }}
        onChanged={backToStart}
        changeTimerRef={changeTimerRef}
      />
  );

  return (
    <>
      <div className="catalog__layout">
      <div ref={sidebar} className="catalog__sidebar">
      {/* Поиск липнет вместе с отбором: искать по названию и смотреть
          выдачу приходится одновременно, и уезжающее вверх поле заставляло
          бы возвращаться к началу страницы на каждый запрос. */}
      <div
        ref={bar}
        className={[
          "catalog__bar",
          stuck ? "is-stuck" : "",
        ]
          .filter(Boolean)
          .join(" ")}

      >
        <div className="catalog__barrow">
          <div className="catalog__mobile-actions">
            <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
            <button type="button" className="catalog__filter-button" aria-label={active ? `Фильтрация: ${active}` : 'Фильтрация'}>
              <IconFilter size={16} stroke={1.5} aria-hidden="true" />
              <span>Фильтрация</span>
            </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="catalog-filter-popover" side="bottom" align="start" sideOffset={8} collisionPadding={16} avoidCollisions={false} aria-label="Фильтрация проектов" onOpenAutoFocus={event => event.preventDefault()}>
                {renderFilters(true)}
              </Popover.Content>
            </Popover.Portal>
            </Popover.Root>
            <CatalogSort compact filters={filters} onChange={next => {
              if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
              router.replace(filtersToHref(next, pathname), { scroll: false });
              backToStart();
            }} />
          </div>
          <CatalogSearch value={filters.q ?? ""} onChange={search} />
        </div>
      </div>
      {renderFilters()}
      </div>

      <div ref={results} className="catalog__results">
        {/* Счёта здесь нет намеренно. Ни «2 из 37», ни «37 проектов»: человеку
            не важно, сколько вариантов он отбросил и насколько велик каталог.
            Важно одно, есть ли в нём то, что он искал. Поэтому говорим только
            тогда, когда ответ отрицательный. */}
        {narrowed && !shownMatched.length ? (
          <h2 className="catalog__band">{copy.catalogMatchedNone}</h2>
        ) : null}

        {shownMatched.length ? (
          <div className="grid-2">
            {shownMatched.map((item) => (
              <div key={item.id}>{item.card}</div>
            ))}
          </div>
        ) : null}

        {/* Хвост каталога. Под избранным его нет: показывать «остальное»,
            когда человек попросил только своё, значит не услышать просьбу. */}
        {picked && !onlyFavorites && shownRest.length ? (
          <>
            <h2 className="catalog__band catalog__band--rest">
              <span>{copy.catalogRest}</span>
            </h2>
            <div className="grid-2">
              {shownRest.map((item) => (
                <div key={item.id}>{item.card}</div>
              ))}
            </div>
          </>
        ) : null}

        {onlyFavorites && !shownMatched.length ? (
          <p className="catalog__empty">{copy.favoritesEmpty}</p>
        ) : null}
      </div>
      </div>
    </>
  );
}
