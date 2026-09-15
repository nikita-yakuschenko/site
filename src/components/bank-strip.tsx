"use client";

import { useEffect, useRef } from "react";

/**
 * Знак банка. Второй файл нужен там, где фирменный логотип под курсором
 * меняется на чёрный: в разметке лежат оба, а переключает их прозрачность.
 */
export type BankPartner = {
  name: string;
  src: string;
  inkSrc?: string;
};

// Темп ленты: знак шириной 168px проходит мимо примерно за четыре секунды.
const SPEED = 40;

/* Пауза после касания. За это время догорает инерция нативной прокрутки:
 * возьми меньше, и лента вырвется из-под пальца на полпути. */
const RESUME_MS = 2000;

// Граница та же, что в стилях: в строку знаки не встают только здесь.
const NARROW = "(max-width: 960px)";

const STILL = "(prefers-reduced-motion: reduce)";

/**
 * Полоса знаков банков. На узком экране едет сама и слушается пальца: под
 * ней обычная горизонтальная прокрутка, поэтому жест, инерция и выбор между
 * лентой и прокруткой страницы достаются от браузера.
 *
 * Набор знаков идёт трижды. Видна середина, копии по краям дают запас в обе
 * стороны: у прокрутки есть края, и без запаса лента упиралась бы в них.
 * Уехав за набор, позиция возвращается в середину — наборы одинаковые, и
 * подмены не видно.
 */
export function BankStrip({ partners }: { partners: BankPartner[] }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const view = viewRef.current;
    const track = trackRef.current;
    if (!view || !track) return;

    const narrow = matchMedia(NARROW);
    const still = matchMedia(STILL);

    let frame = 0;
    let prev = 0;
    // Время, до которого лента стоит: палец на ней или инерция ещё идёт.
    let holdUntil = 0;
    /* Своя позиция с дробной частью. Прокрутка округляет её до пикселя, и
     * складывать шаг с округлённым значением нельзя: остаток терялся бы
     * каждый кадр, а лента шла в полтора раза быстрее заданного. */
    let pos = 0;

    // Шаг, с которым лента повторяется: ширина одного набора знаков.
    const rowWidth = () =>
      track.firstElementChild?.getBoundingClientRect().width ?? 0;

    // Позиция возвращается в средний набор, пока лента едет сама. Под пальцем
    // её не трогаем: правка прокрутки обрывает инерцию.
    const recenter = () => {
      const width = rowWidth();
      if (!width) return;
      if (pos >= width * 2) pos -= width;
      else if (pos < width) pos += width;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // Первый кадр и возврат на вкладку не должны давать рывок.
      const step = prev ? Math.min((now - prev) / 1000, 0.05) : 0;
      prev = now;
      if (now < holdUntil) return;
      // Разошлись больше, чем на округление, — значит крутили руками.
      if (Math.abs(pos - view.scrollLeft) > 1.5) pos = view.scrollLeft;
      pos += SPEED * step;
      recenter();
      view.scrollLeft = pos;
    };

    const hold = () => {
      holdUntil = Number.POSITIVE_INFINITY;
    };

    const release = () => {
      holdUntil = performance.now() + RESUME_MS;
    };

    const start = () => {
      if (frame) return;
      const width = rowWidth();
      // Встаём в середину, только если пришли со стороны: вернувшись в кадр,
      // лента продолжает с того места, где стояла.
      if (pos < width || pos >= width * 2) {
        pos = width;
        view.scrollLeft = pos;
      }
      prev = 0;
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // Там, где лента не едет сама, она начинается с первого знака: иначе
    // осталась бы стоять сдвинутой в копию, а копий там нет.
    const reset = () => {
      pos = 0;
      view.scrollLeft = 0;
    };

    // Полоса за пределами кадра не едет: каждый кадр ленты — пересчёт
    // прокрутки, и тратить его на то, чего не видно, незачем.
    let onScreen = false;
    const watcher = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
      sync();
    });

    function sync() {
      if (narrow.matches && !still.matches) {
        if (onScreen) start();
        else stop();
        return;
      }
      stop();
      reset();
    }

    view.addEventListener("pointerdown", hold);
    view.addEventListener("pointerup", release);
    view.addEventListener("pointercancel", release);
    view.addEventListener("wheel", release, { passive: true });
    narrow.addEventListener("change", sync);
    still.addEventListener("change", sync);
    watcher.observe(view);

    return () => {
      stop();
      watcher.disconnect();
      view.removeEventListener("pointerdown", hold);
      view.removeEventListener("pointerup", release);
      view.removeEventListener("pointercancel", release);
      view.removeEventListener("wheel", release);
      narrow.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
    };
  }, []);

  const logos = () =>
    partners.map(({ name, src, inkSrc }) =>
      inkSrc ? (
        <span className="mortgage-partner-pair" key={name}>
          <img className="mortgage-partner mortgage-partner--primsoc" src={inkSrc} alt={name} />
          <img className="mortgage-partner mortgage-partner--primsoc-brand" src={src} alt="" aria-hidden="true" />
        </span>
      ) : (
        <img className="mortgage-partner" key={name} src={src} alt={name} />
      ),
    );

  return (
    <div className="mortgage-showcase__partners" aria-label="Банки-партнёры">
      <div className="mortgage-showcase__partner-list" ref={viewRef}>
        <div className="mortgage-partner-track" ref={trackRef}>
          <div className="mortgage-partner-row">{logos()}</div>
          <div className="mortgage-partner-row" aria-hidden="true">{logos()}</div>
          <div className="mortgage-partner-row" aria-hidden="true">{logos()}</div>
        </div>
      </div>
    </div>
  );
}
