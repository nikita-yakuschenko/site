"use client";

import { Fragment, useEffect, useOptimistic, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CatalogFilters, CatalogSort } from "./catalog-filters";
import { CatalogSearch } from "./catalog-search";
import { CatalogFeedOffer } from "./catalog-feed-offer";
import * as Popover from "@radix-ui/react-popover";
import { flushSync } from 'react-dom';
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
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { sortCatalog, type SortableProject } from "../lib/catalog/order";
import { useRegionCode } from "./region-bootstrap";
import { copy } from "../lib/copy";
import { trackMetricaAction } from "../lib/metrica-form-goals";

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


function catalogAccentPositions(firstGroupLength: number, restLength: number) {
  const mobile = new Set<number>();
  const wide = new Set<number>();
  const total = firstGroupLength + restLength;
  const mobileGaps = [4, 7, 3, 6, 5];
  const wideGaps = [6, 9, 5, 7, 8];
  const column = (index: number) => (index < firstGroupLength ? index : index - firstGroupLength) % 2;

  for (let index = -1, step = 0; ; step++) {
    index += mobileGaps[step % mobileGaps.length] ?? 4;
    if (index >= total) break;
    mobile.add(index);
  }
  for (let index = -1, step = 0; ; step++) {
    let next = index + (wideGaps[step % wideGaps.length] ?? 6);
    if (index >= 0 && column(next) === column(index)) {
      // Both groups start in the left column, so the split can repeat a side.
      if (column(next + 1) !== column(index)) next++;
      else next += next - index === 9 ? -1 : 2;
    }
    if (next >= total) break;
    wide.add(next);
    index = next;
  }
  return { mobile, wide };
}

function catalogOfferPositions(groupLengths: number[], columns: number) {
  const gaps = [3, 5, 4] as const;
  const totalRows = groupLengths.reduce((sum, length) => sum + Math.ceil(length / columns), 0);
  let row = 0;
  let offer = 0;
  let nextRow: number = gaps[0];
  return groupLengths.map(length => {
    const positions = new Map<number, number>();
    for (let end = columns; end < length + columns; end += columns) {
      row++;
      if (row !== nextRow || row >= totalRows) continue;
      positions.set(Math.min(end, length) - 1, offer);
      offer++;
      nextRow += gaps[offer % gaps.length] ?? gaps[0];
    }
    return positions;
  });
}

export function CatalogBoard({
  filters: appliedFilters,
  facets,
  matched,
  rest,
  picked,
  banner,
  mobileBanner,
}: {
  filters: Filters;
  facets: CatalogFacets;
  matched: BoardItem[];
  rest: BoardItem[];
  picked: boolean;
  banner?: ReactNode;
  mobileBanner?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Controls acknowledge the gesture immediately; server-rendered results
  // continue to describe appliedFilters until navigation completes.
  const [filters, setOptimisticFilters] = useOptimistic(appliedFilters);
  const [filterPending, startFilterTransition] = useTransition();
  const changeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  /* Раскрытие колонки на узком экране. Живёт здесь, потому что кнопка стоит
     в полосе поиска, а сама колонка ниже. */
  const [open, setOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const [searchPending, startSearchTransition] = useTransition();
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
  const shownMatched = sortCatalog(keep(matched), appliedFilters.sort, region);
  const shownRest = keep(rest);
  const restLength = picked && !onlyFavorites ? shownRest.length : 0;
  const accentPositions = catalogAccentPositions(shownMatched.length, restLength);
  const groupLengths = [shownMatched.length, restLength];
  const mobileOffers = catalogOfferPositions(groupLengths, 1);
  const wideOffers = catalogOfferPositions(groupLengths, 2);
  const renderCards = (items: BoardItem[], group: 0 | 1) => items.map((item, index) => {
    const position = group === 0 ? index : shownMatched.length + index;
    const mobileOffer = mobileOffers[group]?.get(index);
    const wideOffer = wideOffers[group]?.get(index);
    return (
      <Fragment key={item.id}>
        <div data-card-accent-mobile={accentPositions.mobile.has(position) || undefined} data-card-accent-wide={accentPositions.wide.has(position) || undefined}>{item.card}</div>
        {mobileOffer !== undefined && <CatalogFeedOffer key={`mobile-${mobileOffer}`} index={mobileOffer} layout="mobile" />}
        {wideOffer !== undefined && <CatalogFeedOffer key={`wide-${wideOffer}`} index={wideOffer} layout="wide" />}
      </Fragment>
    );
  });
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
    const closeOnDesktop = () => { if (desktop.matches) { setOpen(false); setSearchExpanded(false); } };
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
    startSearchTransition(() => {
      setOptimisticFilters({ ...filters, q: q || undefined });
      router.replace(filtersToHref({ ...filters, q: q || undefined }, pathname), { scroll: false });
    });
  };

  const navigate = (next: Filters) => {
    const { q: _currentQuery, ...currentFilters } = filters;
    const { q: _nextQuery, ...nextFilters } = next;
    if (JSON.stringify(currentFilters) !== JSON.stringify(nextFilters)) trackMetricaAction('catalog_filter');
    startFilterTransition(() => {
      setOptimisticFilters(next);
      router.replace(filtersToHref(next, pathname), { scroll: false });
    });
    backToStart();
  };

  const reset = () => {
    if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
    setOnlyFavorites(false);
    navigate({});
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
        onNavigate={navigate}
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
        <div className={`catalog__barrow${searchExpanded ? ' is-search-open' : ''}`}>
          <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Anchor asChild>
          <div className="catalog__mobile-actions" inert={searchExpanded}>
            <span aria-hidden="true" />
            <Popover.Trigger asChild>
            <button type="button" className="catalog__filter-button" aria-label={active ? `Фильтрация: ${active}` : 'Фильтрация'}>
              <IconFilter size={16} stroke={1.5} aria-hidden="true" />
              <span>Фильтрация</span>
            </button>
            </Popover.Trigger>
            <CatalogSort compact filters={filters} onChange={next => {
              if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
              navigate(next);
            }} />
          </div>
          </Popover.Anchor>
          <Popover.Portal>
              <Popover.Content className="catalog-filter-popover" side="bottom" align="start" sideOffset={8} collisionPadding={16} avoidCollisions={false} aria-label="Фильтрация проектов" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => { if (document.activeElement === searchInput.current) event.preventDefault(); }}>
                {renderFilters(true)}
              </Popover.Content>
          </Popover.Portal>
          </Popover.Root>
          <button type="button" className={`catalog__search-toggle${filters.q ? ' is-active' : ''}`} aria-label={filters.q ? `Поиск проектов: ${filters.q}` : 'Поиск проектов'} aria-expanded={searchExpanded} disabled={searchExpanded} onClick={() => {
            flushSync(() => { setOpen(false); setSearchExpanded(true); });
            // Keep focus inside the initiating gesture so iOS opens the keyboard
            // together with the field, rather than after a passive effect.
            searchInput.current?.focus({ preventScroll: true });
          }}><IconSearch size={18} stroke={1.75} aria-hidden="true" /></button>
          <CatalogSearch value={appliedFilters.q ?? ""} onChange={search} pending={searchPending} expanded={searchExpanded}
            inputRef={searchInput}
            onApplied={() => { setSearchExpanded(false); }} onClose={() => setSearchExpanded(false)} />
        </div>
      </div>
      {renderFilters()}
      </div>

      <div ref={results} className="catalog__results" aria-busy={searchPending || filterPending}>
        {!narrowed && shownMatched.length > 0 && mobileBanner ? <div className="catalog__mobile-mortgage">{mobileBanner}</div> : null}
        {!narrowed && shownMatched.length > 0 && banner ? <div className="catalog__desktop-mortgage">{banner}</div> : null}
        {/* Счёта здесь нет намеренно. Ни «2 из 37», ни «37 проектов»: человеку
            не важно, сколько вариантов он отбросил и насколько велик каталог.
            Важно одно, есть ли в нём то, что он искал. Поэтому говорим только
            тогда, когда ответ отрицательный. */}
        {narrowed && !shownMatched.length ? (
          <h2 className="catalog__band">{copy.catalogMatchedNone}</h2>
        ) : null}

        {shownMatched.length ? (
          <div className="grid-2">
            {renderCards(shownMatched, 0)}
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
              {renderCards(shownRest, 1)}
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
