"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { copy, nbspText } from "../lib/copy";
import { optimizedSrc, optimizedSrcSet } from "../lib/media";
import { CarouselProgress, CAROUSEL_SLIDE_MS } from "./carousel-progress";

/**
 * Сообщение баннера. Постоянное: это то, что компания говорит о себе
 * всегда, и ротации оно не требует. Мобильный кадр необязателен — если его
 * нет, берётся общий.
 */
export type HeroMessage = {
  heading: string;
  headingMore?: string;
  text?: string;
  cta: string;
  href: string;
  image: string;
  imageMobile?: string;
};

/**
 * Медиа-слот поверх кадра. Листаются именно они, а не сообщение баннера.
 *
 * Медиа необязательно, но если есть — в слоте картинка или видео. video
 * старше image: задано и то и другое — играет видео, картинка остаётся
 * постером на время загрузки.
 *
 * cutout отмечает картинку, вырезанную на прозрачный фон: такая вписывается
 * в слот целиком. Фотография кадрируется заливкой — иначе вокруг неё
 * остаются неоднородные поля.
 */
export type HeroPromo = {
  eyebrow?: string;
  heading: string;
  text?: string;
  cta: string;
  /** Раньше вёл на страницу; слот теперь открывает форму заявки. */
  href?: string;
  image?: string;
  video?: string;
  cutout?: boolean;
};

// Длительность слота. Текста в карточке три-четыре строки, шести секунд
// на прочтение не хватало. Значение отсюда же уходит в CSS-переменную, чтобы
// полоска прогресса и смена слота не разъезжались.
const SLIDE_MS = CAROUSEL_SLIDE_MS;

// Порог жеста: доля ширины слота, после которой лента доводит до следующего,
// а не возвращается. Четверть — достаточно, чтобы короткое касание при
// вертикальной прокрутке не листало слоты.
const SWIPE_RATIO = 0.25;

// Длительность доводки дорожки. Уходит в CSS-переменную: по этому же сроку
// компонент переставляет дорожку с клона на настоящий слот, и разъехаться
// двум значениям нельзя.
const SHIFT_MS = 420;

/* Три режима ленты, и границы те же, что в стилях: разметка и поведение
 * переключаются вместе.
 *
 * От 600px слот — широкая плашка во всю ширину содержимого. От 1100px их в
 * кадре две: на половину ширины карточка ещё читается, на треть уже нет.
 * Ниже 600px остаётся узкая строка с жестом.
 */
const RAIL_FROM = "(min-width: 600px)";

/* Слот в кадре всегда один.
 *
 * Два слота рядом занимали по половине ширины, и чтобы текст в них
 * помещался, карточку приходилось держать высокой — лента выходила
 * массивной и забирала нижнюю треть кадра. Один слот на три четверти
 * ширины вмещает тот же текст в меньшую высоту, и картинке хватает
 * пропорции 16:9 вместо тесной 4:3.
 *
 * Зазор при одном слоте не нужен: соседних карточек в кадре нет. Он
 * остаётся в расчёте шага параметром, потому что от него зависит ширина
 * сдвига дорожки.
 */
const ONE_PER_VIEW = 1;
const NO_GAP = 0;

/**
 * Сдвиг дорожки.
 *
 * Отсчёт ведётся по местам в дорожке, а не по слотам: перед первым слотом
 * лежат клоны — столько же, сколько слотов видно одновременно. Поэтому слот
 * с номером pos занимает место pos + perView.
 *
 * Шаг сдвига — доля дорожки на один слот: при двух слотах в кадре каждый
 * занимает половину ширины, и лента едет на половину, а не на всю.
 */
function shiftFor(
  pos: number,
  dx: number | null,
  perView: number,
  gap: number,
): string {
  // Шаг — ширина слота вместе с зазором: (ширина кадра + зазор) / слотов.
  const base = `calc((100% + ${gap}px) * ${-(pos + perView) / perView})`;
  return dx === null
    ? `translate3d(${base}, 0, 0)`
    : `translate3d(calc(${base} + ${dx}px), 0, 0)`;
}

function usePreviewHeroCopy(message: HeroMessage): HeroMessage {
  const [draft, setDraft] = useState<Partial<HeroMessage> | null>(null);
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has("cmsPreview")) return;
    const allowed = new Set(["http://localhost:3001", "https://cms.avgst.ru"]);
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== "avgst:preview-hero-copy" || !Array.isArray(event.data.parts)) return;
      const parts = event.data.parts as { key?: string; text?: string; textMore?: string; href?: string; image?: string; imageMobile?: string }[];
      const heading = parts.find((part) => part.key === "hero.heading");
      const subtitle = parts.find((part) => part.key === "hero.subtitle");
      const button = parts.find((part) => part.key === "hero.button");
      const background = parts.find((part) => part.key === "hero.background");
      setDraft({
        heading: heading?.text || message.heading,
        headingMore: heading?.textMore || "",
        text: subtitle?.text ?? message.text,
        cta: button?.text || message.cta,
        href: button?.href || message.href,
        image: background?.image || message.image,
        imageMobile: background?.imageMobile || message.imageMobile,
      });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [message]);
  return draft ? { ...message, ...draft } : message;
}

function usePreviewHeroPromos(promos: readonly HeroPromo[]): readonly HeroPromo[] {
  const [draft, setDraft] = useState<HeroPromo[] | null>(null);
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has("cmsPreview")) return;
    const allowed = new Set(["http://localhost:3001", "https://cms.avgst.ru"]);
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !allowed.has(event.origin) || event.data?.type !== "avgst:preview-hero-copy" || !Array.isArray(event.data.parts)) return;
      const next: HeroPromo[] = promos.map((promo) => ({ ...promo }));
      for (const part of event.data.parts as { key?: string; title?: string; text?: string; textMore?: string; href?: string; image?: string }[]) {
        const match = /^hero\.promo\.(\d+)$/.exec(part.key || "");
        if (!match) continue;
        const promo = next[Number(match[1])];
        if (!promo) continue;
        if (part.title) promo.heading = part.title;
        if (part.text) promo.text = part.text;
        promo.eyebrow = part.textMore || "";
        if (part.href) promo.cta = part.href;
        if (part.image) promo.image = part.image;
      }
      setDraft(next);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [promos]);
  return draft ?? promos;
}

export function HeroCarousel({
  message,
  promos,
}: {
  message: HeroMessage;
  promos: readonly HeroPromo[];
}) {
  const shown = usePreviewHeroCopy(message);
  const slots = usePreviewHeroPromos(promos);
  const count = slots.length;

  /* Бесконечная прокрутка.
   *
   * pos — место в дорожке, и оно намеренно выходит за границы списка: с
   * последнего слота шаг вперёд ведёт на count, с первого шаг назад на -1.
   * По краям дорожки лежат клоны: перед первым слотом копия последнего,
   * после последнего копия первого. Поэтому за краем всегда видно то, что
   * человек ожидает увидеть, и лента едет дальше в ту же сторону.
   *
   * Когда доводка закончилась и pos оказался на клоне, дорожка мгновенно, с
   * выключенным переходом, переставляется на настоящий слот — картинка при
   * этом не меняется, клон и слот выглядят одинаково. Без этого лента при
   * переходе с последнего на первый отматывалась назад через все слоты.
   */
  /* Лента или карусель.
   *
   * На широком экране слоты лежат рядом и ничего не листается: ни клонов,
   * ни жеста, ни автоповорота. Стартовое значение — лента: разметка с
   * сервера приходит для широкого экрана, и на узком её поправит первый же
   * эффект, до отрисовки жеста. */
  const [rail, setRail] = useState(true);

  useEffect(() => {
    const query = window.matchMedia(RAIL_FROM);
    const apply = () => setRail(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const perView = ONE_PER_VIEW;
  const gap = NO_GAP;
  // Листать есть что, только если слотов больше, чем помещается в кадр.
  const rotating = count > perView;

  const [pos, setPos] = useState(0);
  const [playId, setPlayId] = useState(0);
  // Индекс настоящего слота: pos приводится в границы списка.
  const index = count ? ((pos % count) + count) % count : 0;

  /* Подсказка о жесте.
   *
   * Слот занимает кадр целиком, соседний из-за края не выглядывает, и о
   * возможности листать пальцем ничто не сообщает. Поэтому блок слотов
   * дважды коротко смещается и возвращается.
   *
   * Смещается именно блок, а не дорожка внутри него: у блока своей
   * трансформации нет, поэтому подсказка не спорит с положением ленты.
   * Пока анимация висела на дорожке и писала сдвиг от нулевого места, смах
   * до её показа откатывал ленту обратно на первый слот.
   *
   * Снимается первым же действием — дальше она мешала бы.
   */
  const [hinted, setHinted] = useState(false);

  // Пока читают — не листаем. Пауза стоит там, где действительно читают и
  // целятся: на самих слотах.
  const [paused, setPaused] = useState(false);

  const pauseProps = {
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") setPaused(true);
    },
    onPointerLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (event: React.FocusEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setPaused(false);
    },
  };

  const track = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  /* Доворот с клона на настоящий слот — перед шагом, а не после анимации.
   *
   * Дорожка остаётся стоять на клоне, пока не понадобится ехать дальше: для
   * глаза это то же самое, клон и слот выглядят одинаково. А когда шаг
   * нужен, дорожка сначала бесшумно переставляется на настоящий слот и
   * только потом едет.
   *
   * Так доворот не зависит ни от события transitionend, ни от кадра
   * анимации: и то и другое не приходит в свёрнутой вкладке, и лента то
   * уезжала за конец, то навсегда оставалась без перехода.
   */
  const normalize = useCallback((): number => {
    if (count < 2) return pos;
    if (pos >= 0 && pos < count) return pos;
    const real = ((pos % count) + count) % count;
    const node = track.current;
    if (node) {
      node.style.transition = "none";
      node.style.transform = shiftFor(real, null, perView, gap);
      // Чтение вынуждает браузер применить значение до возврата перехода,
      // иначе оба присваивания схлопнутся в одно и доворот проедет с
      // анимацией через всю дорожку.
      void node.offsetWidth;
      node.style.transition = "";
    }
    return real;
    // Пересоздаётся только при смене места или списка: иначе таймер
    // автоповорота сбрасывался бы на каждом рендере.
  }, [count, pos, perView, gap]);

  /* Шаг вперёд или назад. Подсказку тут не снимаем: через step ходит и
     автоповорот, а он не действие человека — снимают её обработчики
     кнопок и жеста. */
  const step = useCallback(
    (by: number) => {
      setPos(normalize() + by);
      setPlayId((value) => value + 1);
    },
    [normalize],
  );

  /** Переход к конкретному слоту: считаем от текущего места, а не от нуля. */
  function goTo(next: number) {
    setHinted(true);
    normalize();
    setPos(next);
    setPlayId((value) => value + 1);
  }

  /* Сдвиг пишется конкретным значением, а не через переменную.
   *
   * С transform, собранным из var(), переход вешался на неанимируемые
   * пользовательские свойства: браузер оставлял CSSTransition в состоянии
   * running навсегда, и тот насмерть перекрывал вычисленный сдвиг — дорожка
   * замирала и не реагировала ни на шевроны, ни на палец.
   */
  function applyShift(dx: number | null) {
    const node = track.current;
    if (!node) return;
    // Во время тяги переход выключен, иначе лента отставала бы от пальца.
    node.classList.toggle("is-dragging", dx !== null);
    node.style.transform = shiftFor(pos, dx, perView, gap);
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!rotating) return;
    if ((event.target as HTMLElement).closest("button")) return;
    dragFrom.current = event.clientX;
    setHinted(true);
    applyShift(0);
  }

  /** Ширина одного слота: в кадре их perView, дорожка шире ровно во столько. */
  function slotWidth(): number {
    return ((track.current?.offsetWidth ?? 0) + gap) / perView;
  }

  function onPointerMove(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = slotWidth();
    // Ограничение шириной слота: дальше одного шага за раз лента не уходит,
    // а упора по краям нет — за ними лежат клоны.
    applyShift(Math.max(-width, Math.min(width, dx)));
  }

  function onPointerEnd(event: React.PointerEvent) {
    if (dragFrom.current === null) return;
    const dx = event.clientX - dragFrom.current;
    const width = slotWidth();
    dragFrom.current = null;
    applyShift(null);
    if (width && Math.abs(dx) > width * SWIPE_RATIO) step(dx < 0 ? 1 : -1);
  }


  if (!count) return null;

  /* Места в дорожке: клоны, все слоты, снова клоны.
   *
   * Клонов с каждой стороны столько же, сколько слотов видно одновременно:
   * при двух в кадре за краем должно лежать два, иначе на последнем шаге
   * справа открывалась бы пустота.
   *
   * Клоны нужны только для вида, поэтому скрыты от программ чтения и не
   * получают фокус — иначе один слот встречался бы в обходе дважды.
   */
  const lane = rotating
    ? [
        ...slots.slice(-perView).map((promo, i) => ({
          promo,
          key: `clone-head-${i}`,
          clone: true,
        })),
        ...slots.map((promo) => ({ promo, key: promo.heading, clone: false })),
        ...slots.slice(0, perView).map((promo, i) => ({
          promo,
          key: `clone-tail-${i}`,
          clone: true,
        })),
      ]
    : slots.map((promo) => ({ promo, key: promo.heading, clone: false }));

  return (
    <section
      className="hero"
      style={
        {
          "--hero-slide-ms": `${SLIDE_MS}ms`,
          "--hero-shift-ms": `${SHIFT_MS}ms`,
        } as React.CSSProperties
      }
    >
      {/* Кадр один: он часть постоянного сообщения и вместе со слотами не
          меняется. */}
      {shown.imageMobile ? (
        <picture className="hero__frame" data-cms-block="hero.background">
          <source media="(min-width: 900px)" sizes="100vw" srcSet={optimizedSrcSet(shown.image, [1080, 1920])} />
          <img src={optimizedSrc(shown.imageMobile, 828, 60)} srcSet={optimizedSrcSet(shown.imageMobile, [384, 828], 60)} sizes="100vw" alt="" decoding="async" />
        </picture>
      ) : (
        <img className="hero__frame" src={optimizedSrc(shown.image, 1920)} srcSet={optimizedSrcSet(shown.image, [828, 1080, 1920])} sizes="100vw" alt="" decoding="async" data-cms-block="hero.background" />
      )}

      {/* Ровный тон по кадру: без градиента и без формы, одна плотность во
          всех точках. Ни плашки под текстом, ни тени по фотографии. */}
      <div className="hero__tone" aria-hidden="true" />

      <div className="hero__stage">
        <div className="hero__copy">
          <h1 data-cms-block="hero.heading">
            {nbspText(shown.heading)}
            {shown.headingMore ? (
              <>
                <br />
                {nbspText(shown.headingMore)}
              </>
            ) : null}
          </h1>
          {shown.text ? <p data-cms-block="hero.subtitle">{nbspText(shown.text)}</p> : null}
          <a className="btn btn-yellow hero__cta" href={shown.href} data-cms-block="hero.button">
            {shown.cta}
            <IconArrowUpRight size={18} stroke={2} />
          </a>
        </div>

        <div
          className={[
            "hero__promos",
            rail ? "is-rail" : null,
            // Подсказка о жесте нужна там, где слот занимает кадр целиком
            // и соседний из-за края не выглядывает, — в узком режиме.
            !rail && !hinted ? "is-hint" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-roledescription="carousel"
          data-cms-block="hero.promos"
          aria-label={copy.heroPromosAria}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          {...pauseProps}
        >
          {/* Кадр ленты: за его краями слоты не видны. Отдельным слоем, а
              не на самом блоке: шевроны и полоса прогресса лежат выше ленты
              и попали бы под ту же обрезку. */}
          <div className="hero__promos-view">
            <div
              ref={track}
              className="hero__promos-track"
              style={{ transform: shiftFor(pos, null, perView, gap) }}
            >
              {lane.map(({ promo, key, clone }, lanePos) => {
                if (!promo) return null;
                // Доступны только слоты, которые сейчас в кадре: от текущего
                // и дальше вправо на perView. Клоны из обхода исключены —
                // иначе один слот встречался бы в нём дважды.
                const slot = lanePos - (rotating ? perView : 0);
                const ahead = (((slot - index) % count) + count) % count;
                const active = !clone && ahead < perView;
                return (
                  <button
                    key={key}
                    type="button"
                    className="hero__promo"
                    data-cms-block={`hero.promo.${slots.indexOf(promo)}`}
                    aria-hidden={!active}
                    tabIndex={active ? undefined : -1}
                    onClick={() => {
                      // Форму заявки подключим отдельно; слот не уводит со страницы.
                    }}
                  >
                    {promo.video || promo.image ? (
                      <span
                        className={
                          promo.cutout
                            ? "hero__promo-media is-cutout"
                            : "hero__promo-media"
                        }
                      >
                        {promo.video ? (
                          <video
                            src={promo.video}
                            poster={promo.image}
                            muted
                            loop
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <img src={optimizedSrc(promo.image ?? '', 640)} alt="" fetchPriority="low" />
                        )}
                      </span>
                    ) : null}

                    <span className="hero__promo-corner" aria-hidden="true">
                      <IconArrowUpRight size={15} stroke={2} />
                    </span>
                    <span className="hero__promo-body">
                      {promo.eyebrow ? (
                        <span className="hero__promo-eyebrow">
                          {promo.eyebrow}
                        </span>
                      ) : null}
                      <strong>{nbspText(promo.heading)}</strong>
                      {promo.text ? <span>{nbspText(promo.text)}</span> : null}
                      <span className="hero__promo-cta">
                        {promo.cta}
                        <IconArrowUpRight size={16} stroke={2} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Шевроны на строке надзаголовка. Слоем, а не в дорожке: внутри
              они уезжали бы вместе со слотом. Распорка 16:9 повторяет высоту
              медиа-слота и опускает ряд ровно на эту строку. */}
          {rotating ? (
            <div className="hero__promo-nav">
              <span className="hero__promo-nav-spacer" aria-hidden="true" />
              <span className="hero__promo-nav-row">
                <button
                  type="button"
                  aria-label={copy.heroPromoPrev}
                  onClick={() => {
                    setHinted(true);
                    step(-1);
                  }}
                >
                  <IconChevronLeft size={15} stroke={2.2} />
                </button>
                <button
                  type="button"
                  aria-label={copy.heroPromoNext}
                  onClick={() => {
                    setHinted(true);
                    step(1);
                  }}
                >
                  <IconChevronRight size={15} stroke={2.2} />
                </button>
              </span>
            </div>
          ) : null}

          {/* Полоса прогресса, она же переключатель, у нижней границы
              карточки. Слоем по той же причине, что шевроны. */}
          {rotating ? (
            <CarouselProgress labels={slots.map(item => item.heading)} index={index} playId={playId} paused={paused} onSelect={goTo} onComplete={() => step(1)} />
          ) : null}
        </div>
      </div>
    </section>
  );
}
