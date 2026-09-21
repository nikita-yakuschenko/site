"use client";

import {
  IconArrowUpRight,
  IconCheck,
  IconGiftFilled,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { copy } from "../lib/copy";
import { formatFromRub, formatRub } from "../lib/locale";
import { tiersForProject } from "../lib/catalog/tiers";
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

/** Ключ хранилища. Выбор общий для каталога, поэтому без слага проекта. */
const TIER_KEY = "avgst:project-tier";
export function ProjectConfig({
  project,
  /** Платёж, посчитанный на сервере, и цена, для которой он посчитан:
   *  из этой пары берётся ставка. Считать её второй раз в компоненте
   *  значило бы завести вторую правду о программе. */
  basePayment,
  basePrice,
}: {
  project: CatalogProject;
  basePayment: number | null;
  basePrice: number | null;
}) {
  const tiers = tiersForProject(project);
  const [tierId, setTierId] = useState("standard");

  /* Читаем после гидрации: на сервере localStorage нет, а разметка должна
     совпасть. Хранилище может быть недоступно — тогда остаётся значение
     по умолчанию. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TIER_KEY);
      if (saved) setTierId(saved);
    } catch {
      /* приватный режим или запрет на хранилище */
    }
  }, []);

  /* Пишем на выборе, а не эффектом от tierId: эффект записи срабатывал бы
     в одном коммите с восстановлением и успевал затереть прочитанное
     значение ещё не обновлённым состоянием. */
  const pickTier = (id: string) => {
    setTierId(id);
    try {
      window.localStorage.setItem(TIER_KEY, id);
    } catch {
      /* записать некуда — выбор живёт до перезагрузки */
    }
  };

  if (!tiers) return null;
  const tier = tiers.find((item) => item.id === tierId) ?? tiers[1]!;

  /* Платёж пропорционален цене: при одной ставке, взносе и сроке аннуитет
     линеен по сумме кредита. У комплектации без ипотеки платежа нет — и
     речи о ней на экране тоже. */
  const monthly =
    tier.mortgage && basePayment && basePrice
      ? Math.round((basePayment * tier.price) / basePrice)
      : null;

  return (
    <section
      className="section section--muted"
      aria-labelledby="project-config-title"
    >
      <div className="section__inner">
        <p className="eyebrow">{copy.configurator}</p>
        <h2 id="project-config-title">{copy.configHeading}</h2>

        <div className="project-config">
          <div>
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
                    onClick={() => pickTier(item.id)}
                  >
                    <span className="project-config__tier-name">
                      {item.name}
                    </span>
                    <span className="project-config__tier-lead">
                      {item.lead}
                    </span>
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
                        <p className="project-config__spec-title">
                          {group.title}
                        </p>
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

          <aside className="project-config__total">
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
            <a className="btn btn-yellow" href="#contacts">
              {copy.getQuote}
              <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
            </a>
          </aside>
        </div>
      </div>
    </section>
  );
}
