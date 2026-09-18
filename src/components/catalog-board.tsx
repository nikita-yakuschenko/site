"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CatalogFilters } from "./catalog-filters";
import { CatalogSearch } from "./catalog-search";
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
import { IconFilter, IconFilterX } from "@tabler/icons-react";
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

/* Класс блокировки прокрутки под раскрытым листом отбора. */
const SHEET_LOCK = "is-catalog-sheet";

export type BoardItem = { id: string; card: ReactNode };

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
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  /* Раскрытие колонки на узком экране. Живёт здесь, потому что кнопка стоит
     в полосе поиска, а сама колонка ниже. */
  const [open, setOpen] = useState(false);
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    readServerFavorites,
  );

  const keep = (items: BoardItem[]) =>
    onlyFavorites ? items.filter((item) => favorites.includes(item.id)) : items;

  const shownMatched = keep(matched);
  const shownRest = keep(rest);
  const narrowed = picked || onlyFavorites;

  /* Растворение под полосой нужно только когда она закреплена. В покое оно
     висело поверх верхнего края карточек и колонки и подмывало их.
     Прилипание считаем по самой полосе: её верх упёрся в край экрана,
     значит она встала. */
  const bar = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = bar.current;
    if (!node) return;
    const update = () => setStuck(node.getBoundingClientRect().top <= 0);
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
  const active = countActive(filters) + (onlyFavorites ? 1 : 0);

  /* Раскрытая на телефоне панель это лист поверх страницы, и страница под
     ним стоять должна неподвижно: иначе прокрутка уводит фон, а лист
     остаётся, и человек теряет место, куда вернётся. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add(SHEET_LOCK);
    return () => root.classList.remove(SHEET_LOCK);
  }, [open]);

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
    /* Блокировку читаем из DOM, а не из состояния: обработчик может
       сработать из замыкания, где лист ещё считался открытым, и проверка по
       состоянию соврала бы. Пока страница заблокирована, ехать ей некуда. */
    if (document.documentElement.classList.contains(SHEET_LOCK)) return;
    const barHeight = Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--catalog-bar"),
      10,
    );
    const target = window.scrollY + node.getBoundingClientRect().top - (barHeight || 0);
    if (window.scrollY <= target) return;
    window.scrollTo({ top: target, behavior: "auto" });
  };

  const search = (raw: string) => {
    const q = normalizeQuery(raw);
    router.replace(filtersToHref({ ...filters, q: q || undefined }, pathname), { scroll: false });
    backToStart();
  };

  return (
    <>
      {/* Поиск липнет вместе с отбором: искать по названию и смотреть
          выдачу приходится одновременно, и уезжающее вверх поле заставляло
          бы возвращаться к началу страницы на каждый запрос. */}
      <div
        ref={bar}
        className={[
          "catalog__bar",
          stuck ? "is-stuck" : "",
          open ? "is-sheet" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="catalog__barrow">
          <CatalogSearch value={filters.q ?? ""} onChange={search} />
          {/* Видна только на узком экране, на широком её прячет CSS: там
              колонка стоит целиком и прятать нечего. */}
          {/* Одна кнопка в двух состояниях. Отбор пуст, значит она
              раскрывает лист отбора; отбор задан, значит сбрасывает его.
              Закрывает лист кнопка «Показать проекты» в самом листе. */}
          <button
            type="button"
            className={active ? "cfilter__toggle is-reset" : "cfilter__toggle"}
            aria-expanded={active ? undefined : open}
            aria-label={active ? copy.resetAll : copy.filtersLabel}
            onClick={() => {
              if (!active) {
                setOpen((value) => !value);
                return;
              }
              setOnlyFavorites(false);
              setOpen(false);
              router.replace(pathname, { scroll: false });
              backToStart();
            }}
          >
            {active ? (
              <IconFilterX size={20} stroke={2} aria-hidden="true" />
            ) : (
              <IconFilter size={20} stroke={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div className="catalog__layout">
      <CatalogFilters
        filters={filters}
        facets={facets}
        onlyFavorites={onlyFavorites}
        favoritesCount={favorites.length}
        onToggleFavorites={() => {
          setOnlyFavorites((value) => !value);
          backToStart();
        }}
        open={open}
        onApply={() => {
          setOpen(false);
          /* Блокировка снимается эффектом уже после отрисовки, и прокрутка
             раньше этого момента обрезалась по высоте закрытого документа. */
          setTimeout(backToStart, 150);
        }}
        onChanged={backToStart}
      />

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
