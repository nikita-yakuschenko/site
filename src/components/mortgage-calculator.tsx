"use client";

import Link from "next/link";
import { IconX } from "@tabler/icons-react";
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
import { LeadForm } from "./lead-form";
import { formatRub } from "../lib/locale";
import { SITE } from "../lib/site";
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

/** Доля → строка для поля: 0.163 → «16,3». Без знака процента: он стоит
 *  в разметке отдельно и не попадает под редактирование. */
function formatRateValue(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct)
    ? String(pct)
    : pct.toFixed(2).replace(/0$/, "").replace(".", ",");
}

/** Строка поля → доля. Пустая или бессмысленная строка даёт undefined, и
 *  расчёт идёт по ставке программы: обнулять платёж на полпути к числу
 *  незачем. Потолок — 99: три знака в поле фиксируют его ширину. */
function parseRate(value: string): number | undefined {
  const pct = Number(value.replace(",", "."));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 99) return undefined;
  return pct / 100;
}

/** Оставляет только цифры и одну запятую, не больше одного знака после
 *  неё: ставки называют с десятыми, «16,35» банки не объявляют. */
function cleanRateInput(value: string): string {
  const digits = value.replace(/[^\d,.]/g, "").replace(".", ",");
  const [whole = "", fraction] = digits.split(",");
  const head = whole.slice(0, 2);
  if (fraction === undefined) return head;
  return `${head},${fraction.slice(0, 1)}`;
}

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

/** Знаков в самом длинном значении поля: цифры плюс пробелы между разрядами. */
function fieldWidthInChars(max: number): number {
  const digits = maxDigits(max);
  return digits + Math.floor((digits - 1) / 3);
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
  /* Форма заявки проявляется на месте карточки результата. */
  const [leadOpen, setLeadOpen] = useState(false);
  const fm = copy.familyMortgage;
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
  /* Своя ставка — только у рыночной: государственной ставки там нет, её
     называет банк, и человек приходит с конкретным предложением на руках.
     У льготных программ ставка задана программой, и менять её нельзя.

     Хранится строкой, а не числом: в ней набирают «16,3», и промежуточные
     «16,» при вводе — нормальное состояние, которое число не выражает. */
  const [rateInput, setRateInput] = useState(() =>
    formatRateValue(program.rate),
  );

  useEffect(() => {
    setRateInput(formatRateValue(program.rate));
  }, [program.rate]);

  const editableRate = programId === "market";
  const rateOverride = editableRate ? parseRate(rateInput) : undefined;

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
        rateOverride,
      }),
    [programId, region, propertyPrice, downPayment, termYears, rateOverride],
  );

  const budgetPack = useMemo(
    () =>
      calculateMaxPropertyPrice({
        programId,
        region,
        rateOverride,
        monthlyPayment: comfortPayment,
        downPayment,
        termYears,
      }),
    [programId, region, comfortPayment, downPayment, termYears, rateOverride],
  );

  const activeResult =
    mode === "payment" ? paymentResult : budgetPack.result;
  const budgetPrice =
    mode === "budget" ? budgetPack.maxPropertyPrice : propertyPrice;

  /* Снимок расчёта уходит вместе с заявкой: что человек накрутил и на чём
     остановился. Разговор начинается не с «а что вы там считали?». */
  const leadMeta = useMemo(
    () => ({
      calc_mode: mode,
      program: programId,
      property_price: Math.round(budgetPrice),
      down_payment: Math.round(downPayment),
      term_years: termYears,
      monthly_payment: Math.round(activeResult.monthlyPayment),
      loan_amount: Math.round(activeResult.loanAmount),
      is_combined: activeResult.isCombined,
      parts: activeResult.parts.map((part) => ({
        kind: part.kind,
        principal: Math.round(part.principal),
        rate: part.annualRate,
      })),
    }),
    [mode, programId, budgetPrice, downPayment, termYears, activeResult],
  );

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
              widthFrom={PRICE_MAX}
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
            {/* Содержимое карточки и форма лежат в одной клетке и
                перекрещиваются прозрачностью: по нажатию расчёт гаснет,
                форма проявляется ровно в его габаритах. Ни карточка, ни
                соседние блоки при этом не двигаются. */}
            <div
              className={
                leadOpen
                  ? "mortgage-calc__reveal is-open"
                  : "mortgage-calc__reveal"
              }
            >
              <div className="mortgage-calc__reveal-copy">
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
                {/* У рыночной ставку набирают прямо здесь — в том месте,
                    где она и показана. Отдельного поля в панели нет
                    намеренно: строка уже есть, и новое поле сдвинуло бы
                    всё остальное ради программы, которая одна из
                    четырёх. */}
                {editableRate ? (
                  <strong className="mortgage-calc__rate-edit">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rateInput}
                      aria-label={t.rateAria}
                      onChange={(event) =>
                        setRateInput(cleanRateInput(event.target.value))
                      }
                      onBlur={() =>
                        setRateInput(
                          formatRateValue(parseRate(rateInput) ?? program.rate),
                        )
                      }
                    />
                    <span aria-hidden="true">%</span>
                  </strong>
                ) : (
                  <strong>
                    {activeResult.isCombined
                      ? `от ${displayRate}`
                      : displayRate}
                  </strong>
                )}
                <span>{t.rateSub}</span>
              </div>
            </div>

            {/* Бокс под разбивкой кредита. У программ без комбинирования
                разбивки нет, и место пустовало — туда встало предупреждение
                о предварительности расчёта. Раньше оно шло отдельной строкой
                под всей панелью, где к расчёту не относилось ни визуально,
                ни по месту. Высота бокса задана, поэтому появление разбивки
                не дёргает карточку. */}
            <div className="mortgage-calc__parts-slot">
              {activeResult.isCombined ? (
                <div className="mortgage-calc__parts">
                  {activeResult.parts.map((part) => (
                    <p key={part.kind}>
                      {/* Ставка стоит при названии части, а не при сумме:
                          она характеризует часть кредита, а справа тогда
                          остаются только суммы — и колонка цифр читается
                          сверху вниз одним столбцом. */}
                      <span>
                        {part.kind === "subsidized"
                          ? t.subsidizedPart
                          : t.marketPart}
                        <em className="mortgage-calc__part-rate">
                          {formatRate(part.annualRate)}
                        </em>
                      </span>
                      <strong>{formatRub(Math.round(part.principal))}</strong>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mortgage-calc__disclaimer">{t.disclaimer}</p>
              )}
            </div>

            <button
              type="button"
              className="btn btn-yellow mortgage-calc__result-cta"
              onClick={() => setLeadOpen(true)}
            >
              {t.resultCta}
            </button>
              </div>

              <div className="mortgage-calc__reveal-slot" aria-hidden={!leadOpen}>
                <div className="mortgage-calc__reveal-card">
                  {/* Крестик в строке подписи первого поля, у правого края. */}
                  <button
                    type="button"
                    className="lead-reveal__close"
                    aria-label={copy.close}
                    onClick={() => setLeadOpen(false)}
                  >
                    <IconX size={14} stroke={2.4} />
                  </button>
                  <LeadForm
                    siteId={SITE.id}
                    variant="card"
                    compact
                    heading={fm.formHeading}
                    submitLabel={t.resultCta}
                    meta={leadMeta}
                  />
                </div>
              </div>
            </div>
            {/* Подпись общая для обоих состояний: не гаснет и держит
                кнопку на одном месте — до раскрытия и после. */}
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
  widthFrom,
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
  widthFrom?: number;
  leading?: ReactNode;
  trailing?: ReactNode;
  pills?: FieldPill[];
  pillsSlot?: boolean;
}) {
  /* Ширина считается от потолка поля, а не от текущего предела: у первого
     взноса предел зависит от стоимости дома, и без этого поле меняло бы
     ширину при движении соседнего ползунка. */
  const widthInChars = fieldWidthInChars(widthFrom ?? max);
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
          {/* Ширина считается от предельного значения поля, а не от текущего
              текста. По тексту она дышала на каждом символе — набор выглядел
              сломанным. По умолчанию же браузер держит ширину под два десятка
              знаков и рисует пустую коробку под миллиарды, которых в этих
              полях не бывает: потолок — 30 млн. */}
          <input
            type="text"
            inputMode="numeric"
            aria-label={label}
            size={widthInChars}
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
