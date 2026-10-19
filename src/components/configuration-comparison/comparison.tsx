"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
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
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { technicalMatrices } from "./model/data";
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

const text = (s: string) => nbspText(nbspText(s));
function Explanation({ info }: { info: TechnicalInfo }) {
  return (
    <div className="comparison-explanation">
      <strong>{info.title}</strong>
      <p>{text(info.summary)}</p>
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
  return (
    <div className="comparison-value" data-status={value.status}>
      <StatusIcon size={18} aria-hidden="true" />
      <span>
        <span className="comparison-sr-only">
          {value.status === "included" ? "Включено. " : ""}
        </span>
        {text(value.displayValue)}
        {value.status === "requiresVerification" && (
          <small>Уточните у специалиста</small>
        )}
      </span>
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
        container={container}
        collisionBoundary={container}
        side="right"
        align="start"
        aria-label={element.label}
      >
        <Explanation info={element.info} />
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
}: {
  project: CatalogProject;
  tiers: readonly PricedTier[];
  selectedTier: string;
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
        />
      </DialogContent>
    </Dialog>
  );
}
function ComparisonBody({
  project,
  tiers,
  selectedTier,
}: {
  project: CatalogProject;
  tiers: readonly PricedTier[];
  selectedTier: string;
}) {
  const matrix = technicalMatrices[project.technology];
  const projectSections = matrix.sections.map((section) => ({
    ...section,
    elements: section.elements.filter(
      (element) => element.id !== "interfloor" || project.floorsValue !== 1,
    ),
  }));
  const [differences, setDifferences] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState(
    Math.max(
      0,
      matrix.packageIds.findIndex((id) => id === selectedTier),
    ),
  );
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const tableWrap = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLTableElement>(null);
  const previousHeight = useRef<number | null>(null);
  const heightAnimation = useRef<Animation | null>(null);
  const changePackage = (index: number) => {
    const next = Math.max(0, Math.min(matrix.packageIds.length - 1, index));
    if (next === selected) return;
    previousHeight.current =
      tableWrap.current?.getBoundingClientRect().height ?? null;
    heightAnimation.current?.cancel();
    setExpandedInfo(null);
    setSelected(next);
  };
  useLayoutEffect(() => {
    const from = previousHeight.current;
    const node = tableWrap.current;
    const to = table.current?.getBoundingClientRect().height;
    if (
      node &&
      from != null &&
      to != null &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      heightAnimation.current = node.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 320, easing: "cubic-bezier(.23,1,.32,1)" },
      );
    }
    previousHeight.current = null;
    return () => {
      heightAnimation.current?.cancel();
    };
  }, [selected]);
  const toggleSection = (id: string) =>
    setCollapsed((before) => {
      const next = new Set(before);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allCollapsed = collapsed.size === projectSections.length;
  return (
    <Tabs
      className="comparison-shell"
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
              allCollapsed
                ? new Set()
                : new Set(projectSections.map((s) => s.id)),
            )
          }
        >
          {allCollapsed ? (
            <IconArrowsMaximize size={18} />
          ) : (
            <IconArrowsMinimize size={18} />
          )}
          {allCollapsed ? "Развернуть разделы" : "Свернуть разделы"}
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
            )
              swipe.current = { x: p.clientX, y: p.clientY };
          }}
          onTouchEnd={(e) => {
            const p = e.changedTouches[0];
            const start = swipe.current;
            swipe.current = null;
            if (p && start) {
              const dx = p.clientX - start.x;
              const dy = p.clientY - start.y;
              if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5)
                changePackage(selected + (dx < 0 ? 1 : -1));
            }
          }}
          onTouchCancel={() => {
            swipe.current = null;
          }}
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
                <col />
                {matrix.packageIds.map((id) => (
                  <col key={id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Раздел / элемент</th>
                  {matrix.packageIds.map((id, index) => {
                    const tier = tiers.find((t) => t.id === id);
                    return (
                      <th scope="col" key={id} data-package={index}>
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
                                  <div className="comparison-label">
                                    <span>
                                      <span className="comparison-full-label">
                                        {text(element.label)}
                                      </span>
                                      <span className="comparison-short-label">
                                        {text(element.mobileLabel)}
                                      </span>
                                    </span>
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
                                  </div>
                                </div>
                              </div>
                            </th>
                            {matrix.packageIds.map((id, index) => (
                              <td key={id} data-package={index}>
                                <div
                                  className="comparison-reveal"
                                  data-open={shown}
                                  inert={!shown}
                                >
                                  <div>
                                    <Value value={element.values[id]!} />
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                          <tr
                            className="comparison-inline-info"
                            aria-hidden={!shown || expandedInfo !== element.id}
                          >
                            <td colSpan={4}>
                              <div
                                id={`comparison-info-${element.id}`}
                                className="comparison-reveal"
                                data-open={shown && expandedInfo === element.id}
                                inert={!shown || expandedInfo !== element.id}
                              >
                                <div>
                                  <Explanation info={element.info} />
                                </div>
                              </div>
                            </td>
                          </tr>
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
