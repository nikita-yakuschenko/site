"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconMinus,
  IconQuestionMark,
  IconArrowUpRight,
  IconHandFinger,
  IconX,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Popover,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { ProjectPassportConcept } from "../project-passport-concept";
import { PackageDescriptionBody } from "./package-description";
import { technicalMatrices, deliveryInfoForRegion } from "./model/data";
import {
  hasDifferences,
  type SpecificationValue,
  type TechnicalElement,
  type TechnicalInfo,
  type TechnicalMatrix,
} from "./model/types";
import type { CatalogProject } from "../../lib/catalog/types";
import { displayedTierPrice, hasSpecialTierPrice, type PricedTier } from "../../lib/catalog/tiers";
import { formatRub, RUB_UNIT } from "../../lib/locale";
import { copy, nbspText } from "../../lib/copy";
import { getMortgageProgram, monthlyPaymentForProject } from "../../lib/mortgage";
import "./comparison.css";

const SHEET_GAP = 16;
const HINT_MS = 900;
const HAND_SIZE = 48;
const HAND_SWING = 40;
const HAND_BOX = { w: 260, h: 190 };
const HAND_ORIGIN = { x: (HAND_BOX.w - HAND_SIZE) / 2, y: 64 };

function fingerArc(dir: 1 | -1) {
  const pivotX = HAND_ORIGIN.x + HAND_SIZE * 0.5;
  const pivotY = HAND_ORIGIN.y + HAND_SIZE * (22 / 24);
  const tipX = HAND_ORIGIN.x + HAND_SIZE * (9.5 / 24);
  const tipY = HAND_ORIGIN.y + HAND_SIZE * (3 / 24);
  const dx = tipX - pivotX;
  const dy = tipY - pivotY;
  const radius = Math.hypot(dx, dy);
  const rad = ((dir === 1 ? -HAND_SWING : HAND_SWING) * Math.PI) / 180;
  const endX = pivotX + dx * Math.cos(rad) - dy * Math.sin(rad);
  const endY = pivotY + dx * Math.sin(rad) + dy * Math.cos(rad);
  const sweep = dir === 1 ? 0 : 1;
  return `M ${tipX.toFixed(2)} ${tipY.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweep} ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

const text = (s: string) =>
  nbspText(
    nbspText(
      s.replace(/(?:согласно|по) архитектурному проекту/gi, "согласно проекту"),
    ),
  );
function scrubSlide(animation: Animation, distance: number) {
  const target = (animation.effect as KeyframeEffect).target as HTMLElement;
  const viewport =
    target.classList.contains("comparison-slide-viewport") &&
    !target.classList.contains("comparison-slide-outgoing")
      ? target
      : target.parentElement!;
  animation.currentTime =
    Math.min(
      1,
      Math.max(0, distance / viewport.getBoundingClientRect().width),
    ) * 280;
}
function Explanation({ info }: { info: TechnicalInfo }) {
  return (
    <div className="comparison-explanation">
      <strong>{info.title}</strong>
      {info.summary && <p>{text(info.summary)}</p>}
      {info.technicalFacts.length > 0 && (
        <>
          <b>Технические характеристики</b>
          <ul>
            {info.technicalFacts.map((f) => (
              <li key={f}>{text(f)}</li>
            ))}
          </ul>
        </>
      )}
      {info.qualifiers.map((q) => (
        <p className="comparison-qualifier" key={q}>
          {text(q)}
        </p>
      ))}
    </div>
  );
}
function Value({ value }: { value: SpecificationValue }) {
  const StatusIcon =
    value.status === "included"
      ? IconCheck
      : value.status === "requiresVerification"
        ? IconQuestionMark
        : IconMinus;
  const statusLabel = {
    included: "Входит",
    excluded: "Не входит",
    notApplicable: "Не применяется",
    requiresVerification: "Уточняется",
  }[value.status];
  const showExplanation =
    value.status === "included" &&
    value.completionLevel !== "structural" &&
    Boolean(value.displayValue);
  return (
    <div className="comparison-value" data-status={value.status}>
      <div className="comparison-value-content">
        <span className="comparison-value-status">
          <StatusIcon size={18} aria-hidden="true" />
          <span>{statusLabel}</span>
        </span>
        {showExplanation && (
          <ul className="comparison-value-details">
            <li>{text(value.displayValue)}</li>
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoButton({
  element,
  container,
}: {
  element: TechnicalElement;
  container: HTMLDivElement | null;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className="comparison-info"
        aria-label={`Подробнее: ${element.label}`}
      >
        <IconInfoCircle size={19} />
      </PopoverTrigger>
      <PopoverContent
        collisionBoundary={container}
        side="right"
        align="center"
        sideOffset={8}
        aria-label={element.label}
      >
        <PopoverArrow width={18} height={6} asChild>
          <svg
            className="comparison-popover-arrow"
            width={18}
            height={6}
            viewBox="0 0 30 10"
            aria-hidden="true"
          >
            <path d="M0 0H30L17.4 7.6Q15 10.2 12.6 7.6Z" />
          </svg>
        </PopoverArrow>
        <div className="comparison-popover-body">
          <Explanation info={element.info} />
        </div>
        <PopoverClose
          className="comparison-info-close"
          aria-label="Закрыть пояснение"
        >
          <IconX size={18} />
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
export function ConfigurationComparison({
  project,
  tiers,
  selectedTier,
  region,
}: {
  project: CatalogProject;
  tiers: readonly PricedTier[];
  selectedTier: string;
  region: "nn" | "msk";
}) {
  const [open, setOpen] = useState(false);
  const matrix = technicalMatrices[project.technology];
  if (!matrix) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="comparison-invitation">
        <div>
            <h3>Подробное сравнение комплектаций</h3>
            <p>
              Материалы, конструкции и инженерные системы - сравните все
              подробности.
            </p>
        </div>
        <DialogTrigger className="btn btn-yellow comparison-launch">
          Сравнить комплектации <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
        </DialogTrigger>
      </div>
      <DialogContent>
        <div className="comparison-passport">
          <ProjectPassportConcept project={project.name} projectSlug={project.slug} placement="comparison" active={open} />
        </div>
        <ComparisonBody
          matrix={matrix}
          project={project}
          tiers={tiers}
          selectedTier={selectedTier}
          region={region}
        />
      </DialogContent>
    </Dialog>
  );
}
function ComparisonBody({
  matrix,
  project,
  tiers,
  selectedTier,
  region,
}: {
  matrix: TechnicalMatrix;
  project: CatalogProject;
  tiers: readonly PricedTier[];
  selectedTier: string;
  region: "nn" | "msk";
}) {
  const projectSections = matrix.sections.map((section) => ({
    ...section,
    elements: section.elements
      .filter(
        (element) => element.id !== "interfloor" || project.floorsValue !== 1,
      )
      .map((element) =>
        element.id === "delivery"
          ? { ...element, info: deliveryInfoForRegion(region) }
          : element,
      ),
  }));
  const [differences, setDifferences] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () =>
      new Set(
        projectSections
          .filter((section) => section.id !== "structure")
          .map((section) => section.id),
      ),
  );
  const [selected, setSelected] = useState(
    Math.max(
      0,
      matrix.packageIds.findIndex((id) => id === selectedTier),
    ),
  );
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const swipe = useRef<{
    x: number;
    y: number;
    origin: number;
    target: number | null;
    axis: "horizontal" | "vertical" | null;
    progress: number;
    width: number;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const slideEpoch = useRef(0);
  const tableWrap = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  const swipeStage = useRef<HTMLDivElement>(null);
  const swipeTrack = useRef<HTMLDivElement>(null);
  const hintAnim = useRef<Animation | null>(null);
  const hintDir = useRef<1 | -1>(selected >= matrix.packageIds.length - 1 ? -1 : 1);
  const [hinting, setHinting] = useState(false);
  const pendingSlides = useRef(
    new Map<string, { element: HTMLElement; height: number }>(),
  );
  const slideAnimations = useRef<Animation[]>([]);
  const outgoingSlides = useRef<HTMLElement[]>([]);
  const slideDirection = useRef(1);
  const pointerNavigation = useRef(true);
  const clearSlides = useCallback(() => {
    slideEpoch.current += 1;
    for (const animation of slideAnimations.current) animation.cancel();
    for (const element of outgoingSlides.current) element.remove();
    slideAnimations.current = [];
    outgoingSlides.current = [];
  }, []);
  const changePackage = (index: number) => {
    const next = Math.max(0, Math.min(matrix.packageIds.length - 1, index));
    if (next === selected) return;
    pendingSlides.current.clear();
    const shouldSlide = false;
    if (shouldSlide) {
      table.current
        ?.querySelectorAll<HTMLElement>(
          `[data-package="${selected}"] .comparison-slide-viewport:not(.comparison-slide-outgoing)`,
        )
        .forEach((viewport) => {
          // Freeze the current visual frame, including interrupted layers, before retargeting.
          const snapshot = viewport.cloneNode(true) as HTMLElement;
          const originals = viewport.querySelectorAll<HTMLElement>(
            "[data-comparison-slide-layer]",
          );
          const copies = snapshot.querySelectorAll<HTMLElement>(
            "[data-comparison-slide-layer]",
          );
          originals.forEach((element, i) => {
            if (copies[i])
              copies[i]!.style.transform = getComputedStyle(element).transform;
          });
          snapshot.style.backgroundColor = getComputedStyle(
            viewport.closest("td, th")!,
          ).backgroundColor;
          pendingSlides.current.set(viewport.dataset.slideKey!, {
            element: snapshot,
            height: viewport.getBoundingClientRect().height,
          });
        });
    }
    clearSlides();
    slideDirection.current = next > selected ? 1 : -1;
    setExpandedInfo(null);
    setSelected(next);
  };
  useLayoutEffect(() => {
    const snapshots = pendingSlides.current;
    pendingSlides.current = new Map();
    if (snapshots.size === 0) return clearSlides;
    const easing = table.current
      ? getComputedStyle(table.current).getPropertyValue("--ease-out").trim()
      : "cubic-bezier(.23,1,.32,1)";
    const dragging = swipe.current?.axis === "horizontal";
    const timing = {
      duration: 280,
      easing: dragging ? "linear" : easing,
      fill: "both" as const,
    };
    table.current
      ?.querySelectorAll<HTMLElement>(
        `[data-package="${selected}"] .comparison-slide-viewport:not(.comparison-slide-outgoing)`,
      )
      .forEach((viewport) => {
        const snapshot = snapshots.get(viewport.dataset.slideKey!);
        const current = viewport.querySelector<HTMLElement>(
          ":scope > .comparison-slide-current",
        );
        if (
          !snapshot ||
          !current ||
          viewport.getBoundingClientRect().height === 0
        )
          return;
        const nextHeight = current.getBoundingClientRect().height;
        const outgoing = snapshot.element;
        outgoing.classList.add("comparison-slide-outgoing");
        outgoing.setAttribute("aria-hidden", "true");
        outgoing.inert = true;
        outgoing.dataset.comparisonSlideLayer = "";
        outgoing.style.height = `${snapshot.height}px`;
        viewport.append(outgoing);
        outgoingSlides.current.push(outgoing);
        const direction = slideDirection.current;
        const enter = current.animate(
          [
            { transform: `translateX(${direction * 100}%)` },
            { transform: "translateX(0%)" },
          ],
          timing,
        );
        const exit = outgoing.animate(
          [
            { transform: "translateX(0%)" },
            { transform: `translateX(${-direction * 100}%)` },
          ],
          timing,
        );
        const resize = viewport.animate(
          [{ height: `${snapshot.height}px` }, { height: `${nextHeight}px` }],
          timing,
        );
        if (dragging) {
          for (const animation of [enter, exit, resize]) {
            animation.pause();
            const gesture = swipe.current!;
            scrubSlide(
              animation,
              (gesture.x - gesture.lastX) * slideDirection.current,
            );
          }
        } else {
          enter.onfinish = () => enter.cancel();
          exit.onfinish = () => {
            outgoing.remove();
            exit.cancel();
          };
          resize.onfinish = () => resize.cancel();
        }
        slideAnimations.current.push(enter, exit, resize);
      });
    return clearSlides;
  }, [selected, clearSlides]);
  const settleDrag = (commit: boolean) => {
    const gesture = swipe.current;
    swipe.current = null;
    if (!gesture || gesture.target === null) return;
    const epoch = slideEpoch.current;
    const easing = getComputedStyle(table.current!)
      .getPropertyValue("--ease-out")
      .trim();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 200;
    const settling = slideAnimations.current.map((animation) => {
      const effect = animation.effect as KeyframeEffect;
      const element = effect.target as HTMLElement;
      const frames = effect.getKeyframes();
      const target = frames[commit ? frames.length - 1 : 0]!;
      const height = target.height;
      const from =
        height !== undefined
          ? { height: getComputedStyle(element).height }
          : { transform: getComputedStyle(element).transform };
      const to =
        height !== undefined
          ? { height: String(height) }
          : { transform: String(target.transform) };
      const next = element.animate([from, to], {
        duration,
        easing,
        fill: "both",
      });
      animation.cancel();
      return next;
    });
    slideAnimations.current = settling;
    void Promise.allSettled(
      settling.map((animation) => animation.finished),
    ).then(() => {
      if (slideEpoch.current !== epoch) return;
      if (!commit) flushSync(() => setSelected(gesture.origin));
      clearSlides();
    });
  };
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 900px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mobile.matches || reduce.matches) return;
    const start = window.setTimeout(() => setHinting(true), 520);
    return () => window.clearTimeout(start);
  }, []);
  const sheetDrag = useRef<{
    x: number;
    y: number;
    axis: "horizontal" | "vertical" | null;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null>(null);
  const placeSheets = useCallback((offset = 0) => {
    const stage = swipeStage.current;
    const track = swipeTrack.current;
    if (!stage || !track || !matchMedia("(max-width: 900px)").matches) return 0;
    const width = stage.getBoundingClientRect().width;
    stage.style.setProperty("--sheet", `${width}px`);
    const x = -selected * (width + SHEET_GAP) + offset;
    track.style.transform = `translate3d(${x}px,0,0)`;
    return width;
  }, [selected]);
  const sheetsPlaced = useRef(false);
  useLayoutEffect(() => {
    const stage = swipeStage.current;
    const track = swipeTrack.current;
    if (!stage || !track) return;
    if (!matchMedia("(max-width: 900px)").matches) {
      track.style.transform = "";
      return;
    }
    if (sheetDrag.current) return;
    const width = stage.getBoundingClientRect().width;
    stage.style.setProperty("--sheet", `${width}px`);
    const rest = -selected * (width + SHEET_GAP);
    if (!hinting) {
      const from = new DOMMatrix(getComputedStyle(track).transform).m41;
      if (sheetsPlaced.current && Math.abs(from - rest) > 1) {
        track.animate(
          [
            { transform: `translate3d(${from}px,0,0)` },
            { transform: `translate3d(${rest}px,0,0)` },
          ],
          { duration: 280, easing: "cubic-bezier(.22,.61,.36,1)" },
        );
      }
      sheetsPlaced.current = true;
      track.style.transform = `translate3d(${rest}px,0,0)`;
      return;
    }
    placeSheets();
    const shift = Math.round(width / 3);
    const dir = hintDir.current;
    const reveal = -dir * shift;
    const animation = track.animate(
      [
        { transform: `translate3d(${rest}px,0,0)`, easing: "cubic-bezier(.22,.8,.36,1)" },
        { transform: `translate3d(${rest + reveal}px,0,0)`, offset: 0.42 },
        { transform: `translate3d(${rest + reveal}px,0,0)`, offset: 0.62, easing: "cubic-bezier(.45,0,.2,1)" },
        { transform: `translate3d(${rest}px,0,0)` },
      ],
      { duration: HINT_MS, easing: "linear", fill: "both" },
    );
    hintAnim.current = animation;
    animation.onfinish = () => {
      hintAnim.current = null;
      placeSheets();
      setHinting(false);
    };
    animation.oncancel = () => {
      hintAnim.current = null;
    };
    return () => animation.cancel();
  }, [hinting, placeSheets, selected]);
  const stopHint = () => {
    hintAnim.current?.cancel();
    if (hinting) setHinting(false);
  };
  const toggleSection = (id: string) =>
    setCollapsed((before) => {
      const next = new Set(before);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allExpanded = collapsed.size === 0;
  return (
    <Tabs
      className="comparison-shell"
      onPointerDownCapture={() => {
        pointerNavigation.current = true;
      }}
      onKeyDownCapture={() => {
        pointerNavigation.current = false;
      }}
      ref={setContainer}
      value={matrix.packageIds[selected]}
      onValueChange={(id) =>
        changePackage(
          matrix.packageIds.indexOf(id as (typeof matrix.packageIds)[number]),
        )
      }
    >
      <header className="comparison-heading">
        <DialogTitle>Сравнение комплектаций</DialogTitle>
        <DialogDescription>
          {matrix.label} · {project.name}
        </DialogDescription>
      </header>
      <div className="comparison-toolbar">
        <label className="comparison-switch">
          <input
            type="checkbox"
            role="switch"
            checked={differences}
            onChange={(e) => setDifferences(e.target.checked)}
          />
          <span aria-hidden="true" />
          Только различия
        </label>
        <button
          type="button"
          onClick={() =>
            setCollapsed(
              allExpanded
                ? new Set(projectSections.map((s) => s.id))
                : new Set(),
            )
          }
        >
          {!allExpanded ? (
            <IconArrowsMaximize size={18} />
          ) : (
            <IconArrowsMinimize size={18} />
          )}
          {allExpanded ? "Свернуть разделы" : "Развернуть разделы"}
        </button>
      </div>
      <div className="comparison-mobile-nav">
        <TabsList aria-label="Выбор комплектации">
          {matrix.packageIds.map((id) => (
            <TabsTrigger key={id} value={id}>
              {tiers.find((t) => t.id === id)?.name ??
                {
                  start: "Стартовая",
                  standard: "Стандартная",
                  project: "Проектная",
                  turnkey: "Под ключ",
                }[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        <p>
          <button
            type="button"
            aria-label="Предыдущая комплектация"
            disabled={selected === 0}
            onClick={() => changePackage(selected - 1)}
          >
            <IconChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {selected + 1} из 3 · Листайте влево или вправо
          </span>
          <button
            type="button"
            aria-label="Следующая комплектация"
            disabled={selected === 2}
            onClick={() => changePackage(selected + 1)}
          >
            <IconChevronRight size={18} />
          </button>
        </p>
      </div>
      <TabsContent value={matrix.packageIds[selected]!} asChild>
        <div
          className="comparison-scroll"
          tabIndex={0}
          aria-label="Техническая таблица"
          onTouchStart={(e) => {
            stopHint();
            const p = e.touches[0];
            if (p && matchMedia("(max-width: 900px)").matches) {
              sheetDrag.current = {
                x: p.clientX,
                y: p.clientY,
                axis: null,
                lastX: p.clientX,
                lastTime: performance.now(),
                velocity: 0,
              };
              return;
            }
            if (
              p &&
              !(e.target as HTMLElement).closest(
                'button,input,a,[data-slot="popover-content"]',
              )
            ) {
              swipe.current = {
                x: p.clientX,
                y: p.clientY,
                origin: selected,
                target: null,
                axis: null,
                progress: 0,
                width:
                  table.current
                    ?.querySelector<HTMLElement>(
                      `td[data-package="${selected}"]`,
                    )
                    ?.getBoundingClientRect().width ?? 160,
                lastX: p.clientX,
                lastTime: performance.now(),
                velocity: 0,
              };
            }
          }}
          onTouchMove={(e) => {
            const p = e.touches[0];
            const drag = sheetDrag.current;
            if (drag && p) {
              const dx = p.clientX - drag.x;
              const dy = p.clientY - drag.y;
              if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8)
                drag.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? "horizontal" : "vertical";
              const now = performance.now();
              drag.velocity = (p.clientX - drag.lastX) / Math.max(1, now - drag.lastTime);
              drag.lastX = p.clientX;
              drag.lastTime = now;
              if (drag.axis === "horizontal") placeSheets(dx);
              return;
            }
            const gesture = swipe.current;
            if (!p || !gesture) return;
            const dx = p.clientX - gesture.x;
            const dy = p.clientY - gesture.y;
            if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8)
              gesture.axis =
                Math.abs(dx) > Math.abs(dy) * 1.5 ? "horizontal" : "vertical";
            if (gesture.axis !== "horizontal") return;
            const now = performance.now();
            gesture.velocity =
              (p.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime);
            gesture.lastX = p.clientX;
            gesture.lastTime = now;
            if (gesture.target === null) {
              const target = gesture.origin + (dx < 0 ? 1 : -1);
              if (target < 0 || target >= matrix.packageIds.length) return;
              gesture.target = target;
              pointerNavigation.current = true;
              gesture.progress = Math.min(
                1,
                Math.max(
                  0,
                  (-dx * Math.sign(target - gesture.origin)) / gesture.width,
                ),
              );
              flushSync(() => changePackage(target));
            }
            gesture.progress = Math.min(
              1,
              Math.max(
                0,
                (-dx * Math.sign(gesture.target - gesture.origin)) /
                  gesture.width,
              ),
            );
            for (const animation of slideAnimations.current)
              scrubSlide(
                animation,
                (gesture.x - p.clientX) *
                  Math.sign(gesture.target - gesture.origin),
              );
          }}
          onTouchEnd={(e) => {
            const drag = sheetDrag.current;
            if (drag) {
              sheetDrag.current = null;
              const p = e.changedTouches[0];
              const dx = p ? p.clientX - drag.x : 0;
              const width = swipeStage.current?.getBoundingClientRect().width ?? 1;
              const velocity = performance.now() - drag.lastTime < 100 ? drag.velocity : 0;
              if (drag.axis === "horizontal" && (dx < -width / 4 || velocity < -0.4) && selected < matrix.packageIds.length - 1)
                changePackage(selected + 1);
              else if (drag.axis === "horizontal" && (dx > width / 4 || velocity > 0.4) && selected > 0)
                changePackage(selected - 1);
              else placeSheets();
              return;
            }
            const gesture = swipe.current;
            const p = e.changedTouches[0];
            if (!gesture || !p) return;
            if (gesture.target !== null) {
              const direction = Math.sign(gesture.target - gesture.origin);
              const velocity =
                performance.now() - gesture.lastTime < 100
                  ? -gesture.velocity * direction
                  : 0;
              settleDrag(
                velocity > 0.4 || (gesture.progress > 0.35 && velocity > -0.4),
              );
            } else {
              swipe.current = null;
              const dx = p.clientX - gesture.x;
              const dy = p.clientY - gesture.y;
              if (
                !gesture.axis &&
                Math.abs(dx) > 48 &&
                Math.abs(dx) > Math.abs(dy) * 1.5
              )
                changePackage(selected + (dx < 0 ? 1 : -1));
            }
          }}
          onTouchCancel={() => {
            sheetDrag.current = null;
            placeSheets();
            settleDrag(false);
          }}
        >
          <div className="comparison-swipe-stage" ref={swipeStage}>
          <div className="comparison-swipe-track" ref={swipeTrack}>
          <div className="comparison-mobile-sheets">
            {matrix.packageIds.map((id, index) => {
              const tier = tiers.find((item) => item.id === id);
              const monthly = tier?.mortgage && tier.price > 0
                ? monthlyPaymentForProject({
                    propertyPrice: tier.price,
                    region,
                    combinedMarketRateOverride: getMortgageProgram("market").rate,
                  })
                : null;
              return (
                <article key={id} className="comparison-mobile-sheet">
                  {hinting && index === selected ? (
                    <div
                      className="comparison-hand"
                      data-dir={hintDir.current}
                      style={{ width: HAND_BOX.w, height: HAND_BOX.h }}
                      aria-hidden="true"
                    >
                      <svg className="comparison-hand__arc" viewBox={`0 0 ${HAND_BOX.w} ${HAND_BOX.h}`}>
                        <path className="comparison-hand__mark" pathLength={1} d={fingerArc(hintDir.current === 1 ? 1 : -1)} />
                      </svg>
                      <span
                        className="comparison-hand__icon"
                        style={{ left: HAND_ORIGIN.x, top: HAND_ORIGIN.y, width: HAND_SIZE, height: HAND_SIZE }}
                      >
                        <IconHandFinger size={HAND_SIZE} stroke={1.6} />
                      </span>
                    </div>
                  ) : null}
                  <header className="comparison-mobile-sheet__head">
                    <strong>{tier?.name ?? id}</strong>
                    <div className="comparison-mobile-sheet__prices">
                      <b className="comparison-price">
                        {tier && hasSpecialTierPrice(tier) ? (
                          <span className="project-config__special-badge">Специальная цена</span>
                        ) : null}
                        {tier && displayedTierPrice(tier) > 0
                          ? formatRub(displayedTierPrice(tier))
                          : "Цена уточняется"}
                      </b>
                      {monthly ? (
                        <p className="comparison-mobile-sheet__mortgage">
                          <span className="project-config__special-badge">Цена в ипотеку</span>
                          {text(`от ${formatRub(monthly).replace(RUB_UNIT, "руб./мес.")}`)}
                          <span>{text(copy.configPayNote)}</span>
                        </p>
                      ) : null}
                    </div>
                  </header>
                  <PackageDescriptionBody
                    matrix={matrix}
                    packageId={id}
                    floors={project.floorsValue}
                    region={region}
                  />
                </article>
              );
            })}
          </div>
          <div className="comparison-table-wrap" ref={tableWrap}>
            <table
              className="comparison-table"
              data-selected={selected}
              ref={table}
            >
              <caption className="comparison-sr-only">
                Технический состав комплектаций дома {project.name}
              </caption>
              <colgroup>
                <col className="comparison-col-label" />
                {matrix.packageIds.map((id) => (
                  <col key={id} className="comparison-col-package" />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Раздел / элемент</th>
                  {matrix.packageIds.map((id, index) => {
                    const tier = tiers.find((t) => t.id === id);
                    return (
                      <th scope="col" key={id} data-package={index}>
                        <div
                          className="comparison-slide-viewport"
                          data-slide-key="heading"
                        >
                          <div
                            className="comparison-slide-current"
                            data-comparison-slide-layer
                          >
                            <strong>{tier?.name ?? id}</strong>
                            {tier?.lead && (
                              <span className="comparison-tier-lead">
                                {text(tier.lead)}
                              </span>
                            )}
                            <b className="comparison-price">
                              {tier && hasSpecialTierPrice(tier) ? <span className="project-config__special-badge">Специальная цена</span> : null}
                              {tier && displayedTierPrice(tier) > 0
                                ? formatRub(displayedTierPrice(tier))
                                : "Цена уточняется"}
                            </b>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              {projectSections.map((section) => {
                const isCollapsed = collapsed.has(section.id);
                const visible = section.elements.filter(
                  (e) => !differences || hasDifferences(e, matrix.packageIds),
                );
                return (
                  <tbody key={section.id}>
                    <tr className="comparison-section">
                      <th colSpan={4} scope="rowgroup">
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          aria-controls={section.elements
                            .map((element) => `comparison-row-${element.id}`)
                            .join(" ")}
                          onClick={() => toggleSection(section.id)}
                        >
                          <IconChevronDown size={19} />
                          {section.title}
                          <small>{visible.length}</small>
                        </button>
                      </th>
                    </tr>
                    {section.elements.map((element) => {
                      const shown =
                        !isCollapsed &&
                        (!differences ||
                          hasDifferences(element, matrix.packageIds));
                      const hasInfo =
                        element.id === "delivery" ||
                        element.info.technicalFacts.length > 0 ||
                        element.info.qualifiers.length > 0;
                      return (
                        <Fragment key={element.id}>
                          <tr
                            id={`comparison-row-${element.id}`}
                            data-element={element.id}
                            data-visible={shown}
                            aria-hidden={!shown}
                            className="comparison-element"
                            data-mobile-status={element.values[matrix.packageIds[selected]!]!.status}
                          >
                            <th scope="row">
                              <div
                                className="comparison-reveal"
                                data-open={shown}
                                inert={!shown}
                              >
                                <div>
                                  <div
                                    className="comparison-label"
                                    data-has-info={hasInfo}
                                  >
                                    <span>
                                      <span className="comparison-full-label">
                                        {text(element.label)}
                                      </span>
                                      <span className="comparison-short-label">
                                        {text(element.mobileLabel)}
                                      </span>
                                    </span>
                                    {hasInfo && (
                                      <>
                                        <span className="comparison-desktop-info">
                                          <InfoButton
                                            element={element}
                                            container={container}
                                          />
                                        </span>
                                        <button
                                          type="button"
                                          className="comparison-info comparison-mobile-info"
                                          aria-expanded={
                                            expandedInfo === element.id
                                          }
                                          aria-controls={`comparison-info-${element.id}`}
                                          aria-label={`Подробнее: ${element.label}`}
                                          onClick={() =>
                                            setExpandedInfo(
                                              expandedInfo === element.id
                                                ? null
                                                : element.id,
                                            )
                                          }
                                        >
                                          <IconInfoCircle size={19} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </th>
                            {matrix.packageIds.map((id, index) => (
                              <td
                                key={id}
                                data-package={index}
                                data-status={element.values[id]!.status}
                              >
                                <div
                                  className="comparison-reveal"
                                  data-open={shown}
                                  inert={!shown}
                                >
                                  <div>
                                    <div
                                      className="comparison-slide-viewport"
                                      data-slide-key={element.id}
                                    >
                                      <div
                                        className="comparison-slide-current"
                                        data-comparison-slide-layer
                                      >
                                        <Value value={element.values[id]!} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                          {hasInfo && (
                            <tr
                              className="comparison-inline-info"
                              aria-hidden={
                                !shown || expandedInfo !== element.id
                              }
                            >
                              <td colSpan={4}>
                                <div
                                  id={`comparison-info-${element.id}`}
                                  className="comparison-reveal"
                                  data-open={
                                    shown && expandedInfo === element.id
                                  }
                                  inert={!shown || expandedInfo !== element.id}
                                >
                                  <div>
                                    <Explanation info={element.info} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {visible.length === 0 && (
                      <tr className="comparison-empty">
                        <td colSpan={4}>
                          В этом разделе комплектации совпадают.
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </table>
          </div>
          </div>
          </div>
          <footer className="comparison-note">
            <IconInfoCircle size={20} />
            <p>
              Подарки и коммерческие условия указаны отдельно в карточках
              комплектаций.
            </p>
          </footer>
        </div>
      </TabsContent>
    </Tabs>
  );
}
