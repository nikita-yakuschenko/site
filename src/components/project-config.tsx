"use client";

import { IconCheck, IconGiftFilled, IconPlus, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { copy, nbspText } from "../lib/copy";
import { formatFromRub, formatRub } from "../lib/locale";
import { getMortgageProgram, monthlyPaymentForProject } from "../lib/mortgage";
import {
  readRegionCode,
  readServerRegionCode,
  subscribeRegion,
} from "../lib/regions";
import { tiersForProject, tiersForRegion, type PricedTier } from "../lib/catalog/tiers";
import {
  DEFAULT_TIER,
  readTier,
  subscribeTier,
  writeTier,
} from "../lib/catalog/tier-selection";
import { PanelLeadForm } from "./panel-lead-form";
import type { CatalogProject } from "../lib/catalog/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

/**
 * Комплектация.
 *
 * Дом продаётся готовыми наборами, поэтому раздел даёт выбрать уровень, а
 * не собирать дом из галочек. Состав перечислен прямо в карточке: разницу
 * между уровнями видно списком, а не описанием. Подробности о материалах
 * — в аккордеоне, тем же, что на страницах ипотеки.
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

const configText = (text: string) => nbspText(nbspText(text));

export function ProjectConfig({ project, configurations, previewTier, onPreviewTierChange }: { project: CatalogProject; configurations?: PricedTier[]; previewTier?: string; onPreviewTierChange?: (tier: string) => void }) {
  const persistedTierId = useSyncExternalStore(
    subscribeTier,
    readTier,
    () => DEFAULT_TIER,
  );
  const tierId = previewTier ?? persistedTierId;
  const region = useSyncExternalStore(
    subscribeRegion,
    readRegionCode,
    readServerRegionCode,
  );
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

  const tiers = configurations ? tiersForRegion(configurations, region) : tiersForProject(project);

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
                <button
                  type="button"
                  className={
                    item.id === tier.id
                      ? "project-config__tier project-config__tier--on"
                      : "project-config__tier"
                  }
                  aria-pressed={item.id === tier.id}
                  onClick={() => onPreviewTierChange ? onPreviewTierChange(item.id) : writeTier(item.id)}
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
                </button>
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

        {/* Заголовок называет уровень: иначе список материалов
              читается как общий для дома, а он у каждой комплектации
              свой. Ключ по уровню — чтобы при переключении список
              собрался заново и первый пункт снова был раскрыт. */}
        {tier.details.length > 0 && <><h3 className="project-config__details-title">
          {configText(`${copy.configDetails} `)}
          <span className="project-config__details-mark">
            {configText(tier.id === 'turnkey' ? 'комплектацию под ключ' : `${tier.nameAcc} ${copy.configTierWordAcc}`)}
          </span>
        </h3>
        {/* Здесь список начинается свёрнутым, хотя обычно первый
              пункт раскрыт: состав материалов открывают по нужде, а не
              читают подряд. */}
        <Accordion
          key={tier.id}
          type="multiple"
          defaultValue={[]}
          className="ui-accordion"
        >
          {tier.details.map((detail) => (
            <AccordionItem
              key={detail.title}
              value={`${tier.id}-${detail.title}`}
            >
              <AccordionTrigger>{configText(detail.title)}</AccordionTrigger>
              <AccordionContent>
                {detail.lead ? (
                  <p className="project-config__spec-lead">{configText(detail.lead)}</p>
                ) : null}

                {detail.items ? (
                  <ul className="project-config__spec-list">
                    {detail.items.map((item) => (
                      <li key={item}>{configText(item)}</li>
                    ))}
                  </ul>
                ) : null}

                {detail.groups?.map((group) => (
                  <div key={group.title} className="project-config__spec">
                    <p className="project-config__spec-title">{configText(group.title)}</p>
                    <ul className="project-config__spec-list">
                      {group.items.map((item) => (
                        <li key={item}>{configText(item)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion></>}
      </div>
    </section>
  );
}
