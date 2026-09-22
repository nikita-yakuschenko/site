"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconFilterX, IconHeart, IconX } from "@tabler/icons-react";
import { RangeSlider } from "./range-slider";
import { filtersToHref, type CatalogFacets } from "../lib/catalog/filters";
import type { CatalogFilters, Range } from "../lib/catalog/types";
import { copy, seriesTitle } from "../lib/copy";

/**
 * Боковая колонка отбора.
 *
 * Колонка, а не верхняя полоса: набор условий будет расти (стиль и всё, что
 * заведут в админке), и полоса шириной в страницу однажды кончится, а
 * колонка растёт вниз сколько нужно. Липкая, потому что отбор должен быть
 * перед глазами всю прокрутку, и по вертикали колонка при этом не стоит
 * ничего.
 *
 * Состояние живёт в адресе, а не здесь: ссылку на отобранную выдачу можно
 * переслать, кнопка «назад» отменяет последнее условие. Ползунки при
 * перетаскивании ждут паузы, иначе каждое движение мыши било бы в сервер и
 * забивало историю браузера.
 */

const SLIDER_DELAY = 350;

/* Radix отдаёт number[] без обещания длины. Приводим к паре явно, а не
   утверждением типа: пустой массив тогда даст края каталога, а не NaN. */
function pair(values: number[], bounds: { min: number; max: number }): [number, number] {
  return [values[0] ?? bounds.min, values[1] ?? bounds.max];
}

function Segment({
  legend,
  values,
  active,
  onToggle,
}: {
  legend: string;
  values: number[];
  active: number[] | undefined;
  onToggle: (value: number) => void;
}) {
  const chosen = active ?? [];
  return (
    <fieldset className="cfilter__group">
      <legend className="cfilter__legend">{legend}</legend>
      <div className="cfilter__badges">
        {values.map((value) => {
          const on = chosen.includes(value);
          return (
            <button
              key={value}
              type="button"
              className={on ? "is-on" : undefined}
              aria-pressed={on}
              onClick={() => onToggle(value)}
            >
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CatalogFilters({
  filters,
  facets,
  onlyFavorites,
  favoritesCount,
  onToggleFavorites,
  open,
  onApply,
  onChanged,
}: {
  filters: CatalogFilters;
  facets: CatalogFacets;
  onlyFavorites: boolean;
  favoritesCount: number;
  onToggleFavorites: () => void;
  /* Раскрыта ли колонка на узком экране. Кнопка живёт в полосе поиска, а не
     здесь: на телефоне отдельная строка под неё стоила бы целого ряда. */
  open: boolean;
  onApply: () => void;
  /* Условия поменялись: выдача стала другой, и надо вернуться к её началу. */
  onChanged: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  /* Пока человек тянет ползунок, показываем его же черновое значение:
     адрес отстаёт на паузу, и без этого ручка дёргалась бы назад. */
  const [draftArea, setDraftArea] = useState<[number, number] | null>(null);
  const [draftPrice, setDraftPrice] = useState<[number, number] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Адрес сменился, значит черновик ползунка устарел. Сверяем прямо в
     рендере, а не эффектом: setState внутри эффекта тянет лишний проход
     рендера, и React об этом прямо предупреждает. Ключом идёт сам адрес,
     потому что объект условий на каждом рендере новый. */
  const key = filtersToHref(filters);
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setDraftArea(null);
    setDraftPrice(null);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const go = (next: CatalogFilters, delay = 0) => {
    if (timer.current) clearTimeout(timer.current);
    const href = filtersToHref(next, pathname);
    const push = () => {
      router.replace(href, { scroll: false });
      onChanged();
    };
    if (delay) timer.current = setTimeout(push, delay);
    else push();
  };

  const toggle = (key: "bedrooms" | "bathrooms" | "floors", value: number) => {
    const current = filters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((n) => n !== value)
      : [...current, value].sort((a, b) => a - b);
    go({ ...filters, [key]: next.length ? next : undefined });
  };

  const areaValue: [number, number] = draftArea ?? [
    filters.area?.min ?? facets.area.min,
    filters.area?.max ?? facets.area.max,
  ];
  const priceValue: [number, number] = draftPrice ?? [
    filters.price?.min ?? facets.price.min,
    filters.price?.max ?? facets.price.max,
  ];

  /* Край диапазона, совпавший с краем каталога, в адрес не пишется:
     «от самого маленького до самого большого» это не условие отбора. */
  const bound = (
    lo: number,
    hi: number,
    limits: { min: number; max: number },
  ): Range | undefined => {
    const min = lo > limits.min ? lo : undefined;
    const max = hi < limits.max ? hi : undefined;
    return min == null && max == null ? undefined : { min, max };
  };

  /* Единица одна на весь диапазон: «3,4 млн–10,1 млн» повторяет её зря. */
  const mln = (rub: number) =>
    (rub / 1_000_000).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  const mlnRange = (lo: number, hi: number) =>
    mln(lo) + "–" + mln(hi) + " " + copy.millionShort;

  const techLabel = (value: "modular" | "panel") =>
    value === "modular" ? copy.techModularShort : copy.techPanelShort;

  const chips: { label: string; clear: CatalogFilters }[] = [];
  if (filters.status === "ready") {
    chips.push({
      label: copy.readyOnly,
      clear: { ...filters, status: undefined },
    });
  }
  if (filters.series) {
    chips.push({ label: seriesTitle(filters.series), clear: { ...filters, series: undefined } });
  }
  if (filters.tech?.length) {
    chips.push({
      label: filters.tech.map(techLabel).join(", "),
      clear: { ...filters, tech: undefined },
    });
  }
  if (filters.area) {
    const lo = filters.area.min ?? facets.area.min;
    const hi = filters.area.max ?? facets.area.max;
    chips.push({
      label: lo + "–" + hi + " " + copy.areaUnit,
      clear: { ...filters, area: undefined },
    });
  }
  if (filters.price) {
    const lo = filters.price.min ?? facets.price.min;
    const hi = filters.price.max ?? facets.price.max;
    chips.push({
      label: mlnRange(lo, hi),
      clear: { ...filters, price: undefined },
    });
  }
  const units = [
    ["bedrooms", copy.bedroomsUnit],
    ["bathrooms", copy.bathroomsUnit],
    ["floors", copy.floorsUnit],
  ] as const;
  for (const [key, unit] of units) {
    const list = filters[key];
    if (list?.length) {
      chips.push({
        label: list.join(", ") + " " + unit,
        clear: { ...filters, [key]: undefined },
      });
    }
  }

  return (
    <aside className="cfilter" aria-label={copy.catalogFiltersAria}>
      <div className={open ? "cfilter__sticky is-open" : "cfilter__sticky"}>
        {/* Прокручивается только эта часть: кнопка возврата к выдаче лежит
            подвалом за её пределами и потому ничего не перекрывает. */}
        <div className="cfilter__scroll">

        <fieldset className="cfilter__group">
          <legend className="cfilter__legend">Статус</legend>
          <div className="cfilter__checks">
            <label className="cfilter__check">
              <input
                type="checkbox"
                checked={filters.status === "ready"}
                onChange={() =>
                  go({
                    ...filters,
                    status: filters.status === "ready" ? undefined : "ready",
                  })
                }
              />
              {copy.readyOnly}
            </label>
          </div>
        </fieldset>

        <fieldset className="cfilter__group">
          <legend className="cfilter__legend">
            {copy.areaLegend}
            <span>
              {areaValue[0]}
              {"–"}
              {areaValue[1]} {copy.areaUnit}
            </span>
          </legend>
          <RangeSlider
            min={facets.area.min}
            max={facets.area.max}
            value={areaValue}
            labels={[copy.areaFrom, copy.areaTo]}
            onChange={(next) => setDraftArea(pair(next, facets.area))}
            onCommit={(next) => {
              const [lo, hi] = pair(next, facets.area);
              go({ ...filters, area: bound(lo, hi, facets.area) }, SLIDER_DELAY);
            }}
          />
        </fieldset>

        <fieldset className="cfilter__group">
          <legend className="cfilter__legend">
            {copy.priceLegend}
            <span>{mlnRange(priceValue[0], priceValue[1])}</span>
          </legend>
          <RangeSlider
            min={facets.price.min}
            max={facets.price.max}
            step={50_000}
            value={priceValue}
            labels={[copy.priceFrom, copy.priceTo]}
            onChange={(next) => setDraftPrice(pair(next, facets.price))}
            onCommit={(next) => {
              const [lo, hi] = pair(next, facets.price);
              go({ ...filters, price: bound(lo, hi, facets.price) }, SLIDER_DELAY);
            }}
          />
        </fieldset>

        <Segment
          legend={copy.bedroomsLegend}
          values={facets.bedrooms}
          active={filters.bedrooms}
          onToggle={(value) => toggle("bedrooms", value)}
        />
        <Segment
          legend={copy.floorsLegend}
          values={facets.floors}
          active={filters.floors}
          onToggle={(value) => toggle("floors", value)}
        />
        <Segment
          legend={copy.bathroomsLegend}
          values={facets.bathrooms}
          active={filters.bathrooms}
          onToggle={(value) => toggle("bathrooms", value)}
        />

        {/* Тише остальных: дом выбирают не по технологии. */}
        <fieldset className="cfilter__group cfilter__group--quiet">
          <legend className="cfilter__legend">{copy.technologyLegend}</legend>
          <div className="cfilter__checks">
            {(["modular", "panel"] as const).map((value) => {
              const on = filters.tech?.includes(value) ?? false;
              return (
                <label key={value} className="cfilter__check">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      const current = filters.tech ?? [];
                      const next = on
                        ? current.filter((item) => item !== value)
                        : [...current, value].sort();
                      go({ ...filters, tech: next.length ? next : undefined });
                    }}
                  />
                  {techLabel(value)}
                </label>
              );
            })}
          </div>
        </fieldset>

        </div>

        {/* Внизу и отдельно: это приятная мелочь, а не то, чем выбирают дом.
            И это не условие отбора, а переключатель вида, в адрес оно не
            попадает, потому что лежит в localStorage и у каждого своё. */}
        <div className="cfilter__group cfilter__group--fav">
          <button
            type="button"
            className={onlyFavorites ? "cfilter__fav is-on" : "cfilter__fav"}
            aria-pressed={onlyFavorites}
            onClick={onToggleFavorites}
          >
            <IconHeart
              size={17}
              stroke={2}
              fill={onlyFavorites ? "currentColor" : "none"}
              aria-hidden="true"
            />
            {copy.favoritesOnly}
            <span>{favoritesCount}</span>
          </button>
        </div>

        {chips.length ? (
          <div className="cfilter__active">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="cfilter__chip"
                onClick={() => go(chip.clear)}
              >
                {chip.label}
                <IconX size={14} stroke={2} aria-hidden="true" />
              </button>
            ))}
            <button type="button" className="cfilter__reset" onClick={() => go({})}>
              <IconFilterX size={14} stroke={2} aria-hidden="true" />
              {copy.resetAll}
            </button>
          </div>
        ) : null}

        {/* Только на узком экране, где панель закрывает собой выдачу.
            Условия применяются сразу, по нажатию, поэтому кнопка ничего не
            отправляет, а просто уводит обратно к проектам. На широком
            экране панель стоит рядом с выдачей, и уходить неоткуда. */}
        <button type="button" className="cfilter__apply" onClick={onApply}>
          {copy.applyFilters}
        </button>
      </div>
    </aside>
  );
}
