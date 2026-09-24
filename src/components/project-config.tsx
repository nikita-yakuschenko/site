"use client";

import { IconCheck, IconGiftFilled } from "@tabler/icons-react";
import { useState, useSyncExternalStore } from "react";
import { copy } from "../lib/copy";
import { formatFromRub, formatRub } from "../lib/locale";
import { getMortgageProgram, monthlyPaymentForProject } from "../lib/mortgage";
import {
  readRegionCode,
  readServerRegionCode,
  subscribeRegion,
} from "../lib/regions";
import { tiersForProject } from "../lib/catalog/tiers";
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

export function ProjectConfig({ project }: { project: CatalogProject }) {
  const tiers = tiersForProject(project);
  const tierId = useSyncExternalStore(
    subscribeTier,
    readTier,
    () => DEFAULT_TIER,
  );
  const region = useSyncExternalStore(
    subscribeRegion,
    readRegionCode,
    readServerRegionCode,
  );
  const [formOpen, setFormOpen] = useState(false);

  if (!tiers) return null;
  const tier = tiers.find((item) => item.id === tierId) ?? tiers[1]!;

  /* Та же модель, что и в калькуляторе карточки: льготная часть ограничена
     лимитом региона, а остаток комбо-кредита считается по ставке из
     переключателя «Рыночная». Масштабировать платёж по цене здесь нельзя. */
  const monthly =
    tier.mortgage
      ? monthlyPaymentForProject({
          propertyPrice: tier.price,
          region,
          combinedMarketRateOverride: getMortgageProgram("market").rate,
        })
      : null;

  return (
    <section
      className="section section--muted"
      aria-labelledby="project-config-title"
    >
      <div className="section__inner">
        <h2 id="project-config-title">{copy.configHeading}</h2>

        <div className="project-config">
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
                  onClick={() => writeTier(item.id)}
                >
                  <span className="project-config__tier-name">{item.name}</span>
                  <span className="project-config__tier-lead">{item.lead}</span>
                  <span className="project-config__tier-price">
                    {formatFromRub(item.price)}
                  </span>
                  <span className="project-config__tier-list">
                    {item.includes.map((line) => (
                      <span key={line}>
                        <IconCheck size={14} stroke={2.4} aria-hidden="true" />
                        {line}
                      </span>
                    ))}
                    {/* Подарки отделены сегментом — подписью между двумя
                          линиями, как хвост каталога: это не продолжение
                          состава, а другая его часть. Плашки у каждой
                          строки не нужны, подпись сказана один раз. */}
                    {item.gifts?.length ? (
                      <span className="project-config__tier-band">
                        <span>{copy.configGift}</span>
                      </span>
                    ) : null}
                    {item.gifts?.map((line) => (
                      <span key={line} className="project-config__tier-gift">
                        <IconGiftFilled size={14} aria-hidden="true" />
                        {line}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Открытая форма переворачивает панель в тёмную: пока в ней
              заполняют поля, она главная на экране, и инверсия говорит
              это без единого слова. */}
          <aside
            className="project-config__total"
            data-form={formOpen ? "true" : "false"}
          >
            <p className="project-config__total-label">
              {tier.name} {copy.configTierWord}
            </p>
            <p className="project-config__total-sum">{formatRub(tier.price)}</p>
            {/* Строка под суммой есть всегда: без неё панель у стартовой
                схлопывается и выглядит обрезанной. Там, где ипотеки нет,
                её место занимает факт о доставке — он верен для всех
                уровней и ни на что не намекает. */}
            {monthly ? (
              <p className="project-config__total-pay">
                {formatRub(monthly)} {copy.configPerMonth}
                <span>{copy.configPayNote}</span>
              </p>
            ) : (
              <p className="project-config__total-pay project-config__total-pay--plain">
                {copy.configDelivery}
                <span>{copy.configDeliveryNote}</span>
              </p>
            )}
            {/* Тот же блок, что и в предложении готового дома: кнопка,
                на месте которой вырастает форма. Панель при этом
                переворачивается в тёмную — про открытие ей сообщает сам
                блок. */}
            <PanelLeadForm
              label={copy.getQuote}
              heading={copy.getQuote}
              projectExternalId={project.id}
              onOpenChange={setFormOpen}
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
        <h3 className="project-config__details-title">
          {copy.configDetails}{" "}
          <span className="project-config__details-mark">
            {tier.nameAcc} {copy.configTierWordAcc}
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
              <AccordionTrigger>{detail.title}</AccordionTrigger>
              <AccordionContent>
                {detail.lead ? (
                  <p className="project-config__spec-lead">{detail.lead}</p>
                ) : null}

                {detail.items ? (
                  <ul className="project-config__spec-list">
                    {detail.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}

                {detail.groups?.map((group) => (
                  <div key={group.title} className="project-config__spec">
                    <p className="project-config__spec-title">{group.title}</p>
                    <ul className="project-config__spec-list">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
