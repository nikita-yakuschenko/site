"use client";
import { useRegionCode } from "./region-bootstrap";

import { IconArrowUpRight, IconCheck, IconGiftFilled, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { copy, nbspText } from "../lib/copy";
import { formatFromRub, formatRub } from "../lib/locale";
import { getMortgageProgram, monthlyPaymentForProject } from "../lib/mortgage";
import { tiersForProject, tiersForRegion, type PricedTier } from "../lib/catalog/tiers";
import {
  DEFAULT_TIER,
  readTier,
  subscribeTier,
  writeTier,
} from "../lib/catalog/tier-selection";
import { LeadForm } from "./lead-form";
import { SITE } from "../lib/site";
import { PanelLeadForm } from "./panel-lead-form";
import type { CatalogProject } from "../lib/catalog/types";
import { ConfigurationComparison } from './configuration-comparison/comparison';

/**
 * Комплектация.
 *
 * Дом продаётся готовыми наборами, поэтому раздел даёт выбрать уровень, а
 * не собирать дом из галочек. Состав перечислен прямо в карточке: разницу
 * между уровнями видно списком, а не описанием. Подробности о материалах
 * — в отдельном техническом сравнении комплектаций.
 *
 * Итог липнет к верху: список длиннее панели, и цена должна оставаться на
 * экране, пока по нему идут.
 *
 * Платёж считается здесь же, на клиенте: он меняется вместе с выбором, а
 * серверное значение в шапке относится к базовой цене проекта.
 *
 * Выбранный уровень переживает перезагрузку и переходит между проектами:
 * это решение про бюджет, а не про конкретный дом, и переспрашивать его
 * на каждой странице незачем.
 */

const configText = (text: string) => nbspText(nbspText(text.replace(/(?:согласно|по) архитектурному проекту/gi, "согласно проекту").replace(/окнами согласно проекту/gi, "Окнами согласно архитектурному проекту")));

export function ProjectConfig({ project, configurations, previewTier, onPreviewTierChange }: { project: CatalogProject; configurations?: PricedTier[]; previewTier?: string; onPreviewTierChange?: (tier: string) => void }) {
  const persistedTierId = useSyncExternalStore(
    subscribeTier,
    readTier,
    () => DEFAULT_TIER,
  );
  const tierId = previewTier ?? persistedTierId;
  const region = useRegionCode();
  const [formOpen, setFormOpen] = useState(false);
  const totalRef = useRef<HTMLElement>(null);
  const panelAnimation = useRef<Animation | null>(null);
  useEffect(() => () => panelAnimation.current?.cancel(), []);

  const changeFormOpen = (next: boolean) => {
    const panel = totalRef.current;
    if (!panel) return;
    const from = panel.getBoundingClientRect().height;
    panelAnimation.current?.cancel();
    panelAnimation.current = null;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Measure the final intrinsic height without interrupting the visible form transition.
      const target = panel.cloneNode(true) as HTMLElement;
      target.dataset.form = String(next);
      Object.assign(target.style, { position: 'fixed', top: '0', left: '0', width: `${panel.getBoundingClientRect().width}px`, height: 'auto', visibility: 'hidden', pointerEvents: 'none', margin: '0' });
      target.querySelectorAll<HTMLElement>('*').forEach(node => { node.style.transition = 'none'; node.style.animation = 'none'; });
      const form = target.querySelector<HTMLElement>('.panel-lead__form');
      const trigger = target.querySelector<HTMLElement>('.panel-lead__trigger');
      if (form) { form.dataset.open = String(next); form.style.gridTemplateRows = next ? '1fr' : '0fr'; }
      if (trigger) { trigger.dataset.open = String(!next); trigger.style.gridTemplateRows = next ? '0fr' : '1fr'; }
      panel.parentElement!.appendChild(target);
      let to = target.getBoundingClientRect().height;
      target.remove();
      const columns = getComputedStyle(panel.parentElement!).gridTemplateColumns.split(' ');
      if (next && columns.length > 1) to = Math.max(to, panel.parentElement!.querySelector('.project-config__tiers')!.getBoundingClientRect().height);
      const animation = panel.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 550, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
      panelAnimation.current = animation;
      animation.onfinish = () => { animation.cancel(); if (panelAnimation.current === animation) panelAnimation.current = null; };
    }
    setFormOpen(next);
  };

  const sourceTiers = configurations ? tiersForRegion(configurations, region) : tiersForProject(project);
  // Panel houses are supplied without internal finishes, including the Project tier.
  const tiers = sourceTiers?.map(item => ({
    ...item,
    lead: project.technology === 'panel' && /внутренн|гипсокартон/i.test(item.lead) ? 'Окна согласно архитектурному проекту.' : item.lead,
    includes: item.includes.filter(line =>
      !(item.id === 'project' && /двер/i.test(line)) &&
      !(project.technology === 'panel' && /внутренн|гипсокартон|отделк[а-яё]*\s+(?:стен|потол|сануз)|чистов/i.test(line)),
    ),
  }));

  if (!tiers?.length) return null;
  const hasStartingTier = tiers.some(item => item.id === 'start');
  const tier = tiers.find((item) => item.id === tierId) ?? tiers.find(item => item.id === 'standard') ?? tiers[0]!;

  /* Та же модель, что и в калькуляторе карточки: льготная часть ограничена
     лимитом региона, а остаток комбо-кредита считается по ставке из
     переключателя «Рыночная». Масштабировать платёж по цене здесь нельзя. */
  const monthly =
    tier.mortgage && tier.price > 0
      ? monthlyPaymentForProject({
          propertyPrice: tier.price,
          region,
          combinedMarketRateOverride: getMortgageProgram("market").rate,
        })
      : null;

  return (
    <section
      className="section section--muted"
      data-cms-block="ProjectConfig"
      aria-labelledby="project-config-title"
    >
      <div className="section__inner">
        <h2 id="project-config-title" data-cms-block="ProjectConfig.heading">{copy.configHeading}</h2>

        <div className="project-config" data-cms-block="ProjectConfig.tiers">
          <ul className="project-config__tiers">
            {tiers.map((item) => (
              <li key={item.id}>
                <ConfigurationTierCard
                  item={item}
                  project={project}
                  region={region}
                  selected={item.id === tier.id}
                  onSelect={() => onPreviewTierChange ? onPreviewTierChange(item.id) : writeTier(item.id)}
                >
                  <span className="project-config__tier-name">{configText(item.name)}</span>
                  <span className="project-config__tier-lead">{configText(item.lead)}</span>
                  <span className="project-config__tier-price">
                    {item.price > 0 ? configText(formatFromRub(item.price)) : 'Цена уточняется'}
                  </span>
                  <span className="project-config__tier-includes-title">
                    {item.id === 'project' ? <><span className="project-config__tier-base">Стандартная</span> комплектация дополняется:</>
                      : item.id === 'turnkey' ? <><span className="project-config__tier-base">Проектная</span> комплектация дополняется:</>
                      : item.id === 'standard' && hasStartingTier ? <><span className="project-config__tier-base">Стартовая</span> комплектация дополняется:</>
                      : item.id === 'standard' ? configText('Всё необходимое для начала:') : configText('Надёжная основа для вашего дома:')}
                  </span>
                  <span className="project-config__tier-list">
                    {item.includes.map((line) => (
                      <span key={line} className="project-config__tier-included">
                        {item.id === 'project' || item.id === 'turnkey' || item.id === 'standard' && hasStartingTier
                          ? <IconPlus size={14} stroke={2.4} aria-hidden="true" />
                          : <IconCheck size={14} stroke={2.4} aria-hidden="true" />}
                        <span>{configText(line)}</span>
                      </span>
                    ))}
                  </span>
                  {item.gifts?.length ? <span className="project-config__tier-gifts">
                    <span className="project-config__tier-band">
                      <span><IconGiftFilled size={14} aria-hidden="true" />{configText(copy.configGift)}</span>
                    </span>
                    <span className="project-config__tier-gift">{configText(item.gifts.join(', '))}</span>
                  </span> : null}
                </ConfigurationTierCard>
              </li>
            ))}
          </ul>

          {/* Открытая форма переворачивает панель в тёмную: пока в ней
              заполняют поля, она главная на экране, и инверсия говорит
              это без единого слова. */}
          <aside
            className="project-config__total"
            ref={totalRef}
            data-form={formOpen ? "true" : "false"}
          >
            {formOpen ? <button type="button" className="project-config__close" aria-label={copy.close} onClick={() => changeFormOpen(false)}><IconX size={14} stroke={2.4} aria-hidden="true" /></button> : null}
            <p className="project-config__total-label">
              <span>Комплектация: </span><strong>{configText(tier.name)}</strong>
            </p>
            <p className="project-config__total-sum">{tier.price > 0 ? formatRub(tier.price) : 'Цена уточняется'}</p>
            {/* Строка под суммой есть всегда: без неё панель у стартовой
                схлопывается и выглядит обрезанной. Там, где ипотеки нет,
                её место занимает факт о доставке — он верен для всех
                уровней и ни на что не намекает. */}
            {monthly ? (
              <p className="project-config__total-pay">
                {formatRub(monthly)} {copy.configPerMonth}
                <span>{configText(copy.configPayNote)}</span>
              </p>
            ) : (
              <p className="project-config__total-pay project-config__total-pay--plain">
                {configText(copy.configDelivery)}
                <span>{configText(copy.configDeliveryNote)}</span>
              </p>
            )}
            {/* Тот же блок, что и в предложении готового дома: кнопка,
                на месте которой вырастает форма. Панель при этом
                переворачивается в тёмную — про открытие ей сообщает сам
                блок. */}
            <PanelLeadForm
              animateTrigger
              open={formOpen}
              label={copy.getQuote}
              heading={copy.getQuote}
              projectExternalId={project.id}
              onOpenChange={changeFormOpen}
              /* Заявка уходит с выбранным уровнем и его ценой: иначе
                 разговор начинается с «а что вы смотрели?». */
              meta={{
                project: project.name,
                tier: tier.name,
                price: tier.price,
              }}
            />
          </aside>
        </div>

        <ConfigurationComparison project={project} tiers={tiers} selectedTier={tier.id} region={region} />
      </div>
    </section>
  );
}


function ConfigurationTierCard({ item, project, region, selected, onSelect, children }: {
  item: PricedTier;
  project: CatalogProject;
  region: "nn" | "msk";
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLButtonElement>(null);
  const previousHeight = useRef<number | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const monthly = item.mortgage && item.price > 0 ? monthlyPaymentForProject({
    propertyPrice: item.price, region, combinedMarketRateOverride: getMortgageProgram("market").rate,
  }) : null;

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 800px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function changeOpen(next: boolean) {
    previousHeight.current = rootRef.current?.getBoundingClientRect().height ?? null;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && rootRef.current?.contains(focused)) focused.blur();
    if (next) { onSelect(); setVisited(true); }
    setOpen(next);
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    const from = previousHeight.current;
    if (!root || from === null) return;
    animationRef.current?.cancel();
    const to = root.getBoundingClientRect().height;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const animation = root.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)',
      });
      animationRef.current = animation;
    }
    if (open) root.querySelector<HTMLInputElement>('.project-config__mobile-form input:not([type="hidden"])')?.focus({ preventScroll: true });
    else quoteRef.current?.focus({ preventScroll: true });
    previousHeight.current = null;
    return () => animationRef.current?.cancel();
  }, [open]);

  return <div ref={rootRef} className="project-config__tier-card" data-form={open} data-selected={selected}>
    <div className="project-config__tier-front" inert={open} aria-hidden={open}>
      <button type="button" className={`project-config__tier${selected ? ' project-config__tier--on' : ''}`} aria-pressed={selected} onClick={onSelect}>
        {children}
      </button>
      <button ref={quoteRef} type="button" className="btn btn-yellow project-config__mobile-quote" aria-expanded={open} onClick={() => changeOpen(true)}>
        {copy.getQuote}<IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
      </button>
    </div>
    {visited && <div className="project-config__total project-config__mobile-form" data-form="true" inert={!open} aria-hidden={!open}>
      <button type="button" className="project-config__close" aria-label={copy.close} onClick={() => changeOpen(false)}><IconX size={14} stroke={2.4} aria-hidden="true" /></button>
      <p className="project-config__total-label"><span>Комплектация: </span><strong>{configText(item.name)}</strong></p>
      <p className="project-config__total-sum">{item.price > 0 ? formatRub(item.price) : 'Цена уточняется'}</p>
      {monthly ? <p className="project-config__total-pay">{formatRub(monthly)} {copy.configPerMonth}<span>{configText(copy.configPayNote)}</span></p>
        : <p className="project-config__total-pay project-config__total-pay--plain">{configText(copy.configDelivery)}<span>{configText(copy.configDeliveryNote)}</span></p>}
      <LeadForm siteId={SITE.id} formId="project-configuration" projectExternalId={project.id} variant="card" compact heading={copy.getQuote} submitLabel={copy.getQuote}
        meta={{ project: project.name, tier: item.name, price: item.price }} />
    </div>}
  </div>;
}
