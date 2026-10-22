"use client";

import {
  Fragment,
  useCallback,
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
  IconTable,
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
import { technicalMatrices, deliveryInfoForRegion } from "./model/data";
import {
  hasDifferences,
  type SpecificationValue,
  type TechnicalElement,
  type TechnicalInfo,
} from "./model/types";
import type { CatalogProject } from "../../lib/catalog/types";
import type { PricedTier } from "../../lib/catalog/tiers";
import { formatFromRub } from "../../lib/locale";
import { nbspText } from "../../lib/copy";
import "./comparison.css";

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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="comparison-invitation">
        <div>
          <IconTable size={26} aria-hidden="true" />
          <div>
            <h3>Что входит в каждую комплектацию</h3>
            <p>
              Материалы, конструкции и инженерные системы - сравните все
              подробности.
            </p>
          </div>
        </div>
        <DialogTrigger className="btn btn--primary comparison-launch">
          Сравнить комплектации <IconChevronRight size={20} />
        </DialogTrigger>
      </div>
      <DialogContent>
        <ComparisonBody
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
  const matrix = technicalMatrices[project.technology];
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
    const shouldSlide =
      pointerNavigation.current &&
      matchMedia("(max-width: 900px)").matches &&
      (!matchMedia("(prefers-reduced-motion: reduce)").matches ||
        swipe.current?.axis === "horizontal");
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
            const p = e.touches[0];
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
          onTouchCancel={() => settleDrag(false)}
        >
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
                              {tier && tier.price > 0
                                ? formatFromRub(tier.price)
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
