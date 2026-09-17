"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { trackEvent } from "../consent/analytics";
import type { CatalogProject } from "../lib/catalog/types";
import { formatRub } from "../lib/locale";
import { copy, projectsInSeries } from "../lib/copy";
import {
  calculateMaxPropertyPrice,
  calculateMortgage,
  catalogHrefWithMaxPrice,
  getEligibleProjects,
  getMortgageProgram,
  MORTGAGE_PROGRAMS,
  type MortgageProgramId,
} from "../lib/mortgage";
import {
  readRegionCode,
  readServerRegionCode,
  subscribeRegion,
} from "../lib/regions";
import { IconArrowUpRight } from "@tabler/icons-react";
import { ProjectCard } from "./project-card";

const t = copy.mortgageCalc;

type Mode = "payment" | "budget";

const PRICE_MIN = 2_500_000;
const PRICE_MAX = 30_000_000;
const PAY_MIN = 15_000;
const PAY_MAX = 250_000;

const DOWN_PERCENT_PILLS = [20, 30, 50] as const;
const TERM_YEAR_PILLS = [10, 15, 20, 25, 30] as const;

type FieldPill = { value: number; label: string; active?: boolean };

function formatRate(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1).replace(".", ",")}%`;
}

function displayMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return Math.round(value).toLocaleString("ru-RU");
}

function maxDigits(max: number): number {
  return String(Math.floor(Math.max(0, max))).length;
}

export function MortgageCalculator({
  projects,
  initialPropertyPrice,
  initialProgramId = "family",
}: {
  projects: CatalogProject[];
  initialPropertyPrice?: number;
  initialProgramId?: MortgageProgramId;
}) {
  const region = useSyncExternalStore(
    subscribeRegion,
    readRegionCode,
    readServerRegionCode,
  );
  const [mode, setMode] = useState<Mode>("payment");
  const [programId, setProgramId] =
    useState<MortgageProgramId>(initialProgramId);
  const program = getMortgageProgram(programId);

  const [propertyPrice, setPropertyPrice] = useState(
    () => initialPropertyPrice ?? 8_000_000,
  );
  const [comfortPayment, setComfortPayment] = useState(60_000);
  const [downPayment, setDownPayment] = useState(() => {
    const price = initialPropertyPrice ?? 8_000_000;
    return Math.round(price * program.minDownPaymentPercent);
  });
  const [termYears, setTermYears] = useState(program.maxTermYears);

  const opened = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onOpen = useEffectEvent(() => {
    if (opened.current) return;
    opened.current = true;
    trackEvent({ type: "mortgage_calculator_open", program: programId });
  });

  useEffect(() => {
    onOpen();
  }, [onOpen]);

  // Минимальный ПВ при смене программы / цены.
  useEffect(() => {
    const min = Math.round(propertyPrice * program.minDownPaymentPercent);
    setDownPayment((prev) => (prev < min ? min : prev));
  }, [program.minDownPaymentPercent, propertyPrice, program]);

  useEffect(() => {
    setTermYears((y) =>
      Math.min(program.maxTermYears, Math.max(program.minTermYears, y)),
    );
  }, [program]);

  const paymentResult = useMemo(
    () =>
      calculateMortgage({
        programId,
        region,
        propertyPrice,
        downPayment,
        termYears,
      }),
    [programId, region, propertyPrice, downPayment, termYears],
  );

  const budgetPack = useMemo(
    () =>
      calculateMaxPropertyPrice({
        programId,
        region,
        monthlyPayment: comfortPayment,
        downPayment,
        termYears,
      }),
    [programId, region, comfortPayment, downPayment, termYears],
  );

  const activeResult =
    mode === "payment" ? paymentResult : budgetPack.result;
  const budgetPrice =
    mode === "budget" ? budgetPack.maxPropertyPrice : propertyPrice;

  const eligible = useMemo(
    () => getEligibleProjects(projects, budgetPrice, 3),
    [projects, budgetPrice],
  );

  const trackParamsChanged = useEffectEvent(() => {
    trackEvent({
      type: "mortgage_parameters_changed",
      program: programId,
      property_price: Math.round(
        mode === "payment" ? propertyPrice : budgetPack.maxPropertyPrice,
      ),
      down_payment: Math.round(downPayment),
      term: termYears,
      monthly_payment: Math.round(
        mode === "payment"
          ? paymentResult.monthlyPayment
          : comfortPayment,
      ),
      available_budget: Math.round(budgetPack.maxPropertyPrice),
      mode,
    });
  });

  const trackCompleted = useEffectEvent(() => {
    trackEvent({
      type: "mortgage_calculation_completed",
      program: programId,
      property_price: Math.round(
        mode === "payment" ? propertyPrice : budgetPack.maxPropertyPrice,
      ),
      down_payment: Math.round(downPayment),
      term: termYears,
      monthly_payment: Math.round(activeResult.monthlyPayment),
      available_budget: Math.round(budgetPack.maxPropertyPrice),
      mode,
    });
  });

  function scheduleAnalytics() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      trackParamsChanged();
      trackCompleted();
    }, 450);
  }

  function selectProgram(id: MortgageProgramId) {
    setProgramId(id);
    trackEvent({ type: "mortgage_program_selected", program: id });
    scheduleAnalytics();
  }

  const downPercent =
    propertyPrice > 0 ? (downPayment / propertyPrice) * 100 : 0;
  const minDown = Math.round(propertyPrice * program.minDownPaymentPercent);
  const minDownPct = Math.round(program.minDownPaymentPercent * 1000) / 10;

  const downPills: FieldPill[] =
    mode === "payment"
      ? DOWN_PERCENT_PILLS.filter((pct) => pct >= minDownPct).map((pct) => ({
          value: Math.round((propertyPrice * pct) / 100),
          label: `${pct}%`,
          active: Math.abs(downPercent - pct) < 0.6,
        }))
      : [];

  const termPills: FieldPill[] = TERM_YEAR_PILLS.filter(
    (y) => y >= program.minTermYears && y <= program.maxTermYears,
  ).map((y) => ({
    value: y,
    label: `${y} ${t.years}`,
    active: termYears === y,
  }));

  const displayRate = formatRate(
    activeResult.isCombined
      ? program.rate
      : (activeResult.parts[0]?.annualRate ?? program.rate),
  );

  return (
    <section
      className="section section--muted mortgage-calc"
      id="mortgage-calc"
      aria-labelledby="mortgage-calc-title"
    >
      <div className="section__inner">
        {/* Заголовок вынесен из панели в шапку секции. Колонкой он забирал
            треть ширины у полей и результата, а сам стоял почти пустым. */}
        <header className="mortgage-calc__head">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="mortgage-calc-title">{t.heading}</h2>
          <p className="mortgage-calc__lead">{t.lead}</p>
        </header>

        <div className="mortgage-calc__panel">
          <div className="mortgage-calc__controls">
            <div
              className="mortgage-calc__modes"
              role="tablist"
              aria-label={t.heading}
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "payment"}
                className={
                  mode === "payment"
                    ? "mortgage-calc__mode is-active"
                    : "mortgage-calc__mode"
                }
                onClick={() => {
                  setMode("payment");
                  scheduleAnalytics();
                }}
              >
                {t.modePayment}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "budget"}
                className={
                  mode === "budget"
                    ? "mortgage-calc__mode is-active"
                    : "mortgage-calc__mode"
                }
                onClick={() => {
                  setMode("budget");
                  scheduleAnalytics();
                }}
              >
                {t.modeBudget}
              </button>
            </div>

            <fieldset className="mortgage-calc__programs" aria-label={t.programLabel}>
              <div className="mortgage-calc__program-list">
                {MORTGAGE_PROGRAMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      p.id === programId
                        ? "mortgage-calc__program is-active"
                        : "mortgage-calc__program"
                    }
                    onClick={() => selectProgram(p.id)}
                  >
                    <span>{p.label}</span>
                    <strong>от {formatRate(p.rate)}</strong>
                  </button>
                ))}
              </div>
            </fieldset>

            {mode === "payment" ? (
              <CalcField
                label={t.propertyPrice}
                suffix="₽"
                value={propertyPrice}
                min={PRICE_MIN}
                max={PRICE_MAX}
                step={50_000}
                onChange={(v) => {
                  setPropertyPrice(v);
                  scheduleAnalytics();
                }}
                /* Пустая строка пилюль резервируется и здесь. Соседняя
                   плитка в ряду их имеет, и без резерва содержимое двух
                   плиток распределялось по высоте по-разному: бегунки
                   вставали на разных уровнях. */
                pillsSlot
              />
            ) : (
              <CalcField
                label={t.comfortPayment}
                suffix={t.perMonth}
                value={comfortPayment}
                min={PAY_MIN}
                max={PAY_MAX}
                step={1_000}
                onChange={(v) => {
                  setComfortPayment(v);
                  scheduleAnalytics();
                }}
                pillsSlot
              />
            )}

            <CalcField
              label={t.downPayment}
              suffix="₽"
              value={downPayment}
              min={mode === "payment" ? minDown : Math.round(500_000)}
              max={
                mode === "payment"
                  ? Math.max(minDown, propertyPrice - 50_000)
                  : 12_000_000
              }
              step={10_000}
              onChange={(v) => {
                setDownPayment(v);
                scheduleAnalytics();
              }}
              /* Доля идёт перед суммой: она отвечает на вопрос «сколько
                 вносим», а рубли уточняют. В обратном порядке глаз читал
                 число и возвращался к проценту. */
              leading={
                <span className="mortgage-calc__tile-pct">
                  {mode === "payment" && Number.isFinite(downPercent)
                    ? `${Math.round(downPercent * 10) / 10}%`
                    : "\u00a0"}
                </span>
              }
              pills={downPills}
              pillsSlot
            />

            <CalcField
              label={t.term}
              suffix={t.years}
              value={termYears}
              min={program.minTermYears}
              max={program.maxTermYears}
              step={1}
              onChange={(v) => {
                setTermYears(v);
                scheduleAnalytics();
              }}
              pills={termPills}
            />
          </div>

          <aside className="mortgage-calc__result">
            <p className="mortgage-calc__hero-num">
              {mode === "payment"
                ? formatRub(Math.round(activeResult.monthlyPayment))
                : formatRub(Math.round(budgetPack.maxPropertyPrice))}
            </p>
            <p className="mortgage-calc__hero-label">
              {mode === "payment"
                ? t.paymentSub
                : `${t.about} · ${t.budgetSub}`}
            </p>

            <div className="mortgage-calc__result-metrics">
              <div>
                <strong>
                  {formatRub(Math.round(activeResult.loanAmount))}
                </strong>
                <span>{t.loanSub}</span>
              </div>
              <div>
                <strong>
                  {activeResult.isCombined
                    ? `от ${displayRate}`
                    : displayRate}
                </strong>
                <span>{t.rateSub}</span>
              </div>
            </div>

            <div
              className="mortgage-calc__parts-slot"
              aria-hidden={!activeResult.isCombined}
            >
              {activeResult.isCombined ? (
                <div className="mortgage-calc__parts">
                  {activeResult.parts.map((part) => (
                    <p key={part.kind}>
                      <span>
                        {part.kind === "subsidized"
                          ? t.subsidizedPart
                          : t.marketPart}
                      </span>
                      <strong>
                        {formatRub(Math.round(part.principal))} ·{" "}
                        {formatRate(part.annualRate)}
                      </strong>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>

            <Link
              className="btn btn-yellow mortgage-calc__result-cta"
              href="#contacts"
            >
              {t.resultCta}
            </Link>
            <p className="mortgage-calc__result-note">{t.resultNote}</p>
          </aside>

          {/* Проекты — часть калькулятора, а не отдельный блок под ним: ради
              них расчёт и затевается. Число выводится здесь один раз; в
              карточке результата и на кнопке его больше нет. */}
          <section
            className="mortgage-calc__matches"
            id="mortgage-calc-projects"
            aria-live="polite"
          >
            <div className="mortgage-calc__matches-head">
              <h3>
                {t.suitable} <strong>{projectsInSeries(eligible.total)}</strong>
              </h3>
              {eligible.total > 0 ? (
                <Link
                  className="mortgage-calc__matches-all"
                  href={catalogHrefWithMaxPrice(budgetPrice)}
                  onClick={() =>
                    trackEvent({
                      type: "mortgage_catalog_clicked",
                      program: programId,
                      available_budget: Math.round(budgetPrice),
                    })
                  }
                >
                  {t.viewAll}
                  <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
                </Link>
              ) : null}
            </div>

            {eligible.items.length ? (
              <div className="mortgage-calc__matches-grid">
                {eligible.items.map((project) => (
                  <div
                    key={project.id}
                    onClickCapture={() =>
                      trackEvent({
                        type: "mortgage_project_clicked",
                        program: programId,
                        projectId: project.id,
                      })
                    }
                  >
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mortgage-calc__matches-empty">{t.projectsEmpty}</p>
            )}
          </section>
        </div>

        <p className="mortgage-calc__disclaimer">{t.disclaimer}</p>
      </div>
    </section>
  );
}

function CalcField({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
  leading,
  trailing,
  pills,
  pillsSlot = false,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  pills?: FieldPill[];
  pillsSlot?: boolean;
}) {
  const [text, setText] = useState(displayMoney(value));
  useEffect(() => {
    setText(displayMoney(value));
  }, [value]);

  const commit = (raw: string, soft: boolean) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, maxDigits(max));
    if (!digits) {
      setText("");
      if (!soft) {
        onChange(min);
        setText(displayMoney(min));
      }
      return;
    }
    const next = Number(digits);
    if (!Number.isFinite(next) || next > max) {
      onChange(max);
      setText(displayMoney(max));
      return;
    }
    setText(soft ? digits : displayMoney(Math.min(max, Math.max(min, next))));
    if (!soft || next >= min) {
      onChange(Math.min(max, Math.max(min, next)));
    }
  };

  return (
    <div className="mortgage-calc__tile">
      <div className="mortgage-calc__tile-head">
        <span className="mortgage-calc__tile-label">{label}</span>
        <div className="mortgage-calc__tile-value">
          {leading}
          {/* size по длине значения. Без него поле держит ширину под два
              десятка знаков и рисует пустую коробку под миллиарды, которых
              в этих полях не бывает: верхняя граница — 30 млн. */}
          <input
            type="text"
            inputMode="numeric"
            aria-label={label}
            size={Math.max(2, text.length)}
            maxLength={maxDigits(max) + Math.floor(maxDigits(max) / 3)}
            value={text}
            onChange={(e) => commit(e.target.value, true)}
            onBlur={() => commit(text, false)}
          />
          {trailing ?? <span>{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {pills?.length || pillsSlot ? (
        <div
          className="mortgage-calc__pills"
          role={pills?.length ? "group" : undefined}
          aria-label={pills?.length ? label : undefined}
          aria-hidden={pills?.length ? undefined : true}
        >
          {pills?.map((pill) => (
            <button
              key={pill.label}
              type="button"
              className={
                pill.active
                  ? "mortgage-calc__pill is-active"
                  : "mortgage-calc__pill"
              }
              onClick={() => onChange(pill.value)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
