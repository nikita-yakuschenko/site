"use client";

import { IconCheck, IconArrowUpRight } from "@tabler/icons-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  PREVIEW_FLOORS,
  PREVIEW_INTERIORS,
  PREVIEW_PROJECT,
  PREVIEW_TIERS,
  type PreviewRoomId,
} from "./project-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

const SECTIONS = [
  { id: "about", label: "О проекте" },
  { id: "exteriors", label: "Фасады" },
  { id: "plan", label: "Планировка" },
  { id: "interiors", label: "Интерьеры" },
  { id: "config", label: "Комплектация" },
] as const;

function rub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

/** Аннуитет — та же формула, что в ипотечном калькуляторе. */
function payment(principal: number, annualRate: number, months: number): number {
  const i = annualRate / 12;
  if (i <= 0) return principal / months;
  const k = Math.pow(1 + i, months);
  return (principal * i * k) / (k - 1);
}

/**
 * Макет страницы проекта.
 *
 * Показывает, как связываются разделы. Главная мысль — планировка и
 * интерьеры это один раздел, разнесённый на два экрана: на плане названы
 * комнаты, интерьеры сняты покомнатно, и выбор комнаты работает в обе
 * стороны. Без этой связи «Планировка» остаётся картинкой, а «Интерьеры»
 * — свалкой кадров, по которой непонятно, что где.
 *
 * Остальное подчинено тому же правилу: раздел получает форму от своего
 * содержимого, а не общий вид «заголовок и сетка картинок».
 */
export function ProjectPreview() {
  const floor = PREVIEW_FLOORS[0]!;
  const [room, setRoom] = useState<PreviewRoomId | null>(null);
  /* Выбранная комплектация. Средняя по умолчанию: крайние читаются как
     «мало» и «дорого», а разговор начинается с середины. */
  const [tierId, setTierId] = useState<string>("standard");
  const interiorsRef = useRef<HTMLDivElement | null>(null);

  const shots = useMemo(
    () =>
      room
        ? PREVIEW_INTERIORS.filter((item) => item.room === room)
        : PREVIEW_INTERIORS,
    [room],
  );

  const tier = PREVIEW_TIERS.find((t) => t.id === tierId) ?? PREVIEW_TIERS[1]!;
  const total = tier.price;

  /* Платёж по семейной: первый взнос 20%, ставка 6%, срок 30 лет. */
  const monthly = Math.round(payment(total * 0.8, 0.06, 360));

  const pickRoom = (id: PreviewRoomId) => {
    setRoom((current) => (current === id ? null : id));
    interiorsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pp">
      <p className="pp__note">
        Макет. Разделы собраны на кадрах «Барнхауса 76», разложенных руками;
        перечень комплектации и цены условные.
      </p>

      {/* Полоса разделов липнет к верху: страница длинная, и без неё
          человек не знает ни сколько её ещё, ни как вернуться. */}
      <nav className="pp__nav" aria-label="Разделы проекта">
        <div className="section__inner pp__nav-inner">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* 1. О проекте — спецификация слева, рассказ справа. Числа вынесены
             в свой столбец: площадь и этажи читают первыми, а в тексте они
             тонули. Приём тот же, что в условиях ипотеки. */}
      <section className="section pp__section" id="about">
        <div className="section__inner">
          <p className="eyebrow">О проекте</p>
          <h2>{PREVIEW_PROJECT.name}</h2>
          <div className="pp__about">
            <dl className="pp__specs">
              {[
                { v: `${PREVIEW_PROJECT.area} м²`, t: "Площадь" },
                { v: PREVIEW_PROJECT.floors, t: "Этаж" },
                { v: PREVIEW_PROJECT.bedrooms, t: "Спальни" },
                { v: PREVIEW_PROJECT.bathrooms, t: "Санузел" },
              ].map((s) => (
                <div key={s.t}>
                  <dt>{s.v}</dt>
                  <dd>{s.t}</dd>
                </div>
              ))}
            </dl>
            <div className="pp__about-text">
              <p>
                Одноэтажный дом на 76 м²: кухня-гостиная на 19,65 м² выходит
                на террасу, две спальни стоят по другую сторону холла.
                Панельно-каркасная технология — стены собираются на заводе и
                привозятся готовыми, поэтому коробка встаёт за несколько
                дней, а не за сезон.
              </p>
              <p>
                Вторая спальня на 8,54 м² собирается и как детская, и как
                кабинет — в интерьерах показаны оба варианта. Санузел один,
                4,48 м², с отдельной душевой зоной, рядом с ним технический
                шкаф под оборудование.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Фасады — бенто: первый кадр крупный, остальные мелкими. Ряд
             одинаковых прямоугольников не говорит, какой кадр главный. */}
      <section className="section section--muted pp__section" id="exteriors">
        <div className="section__inner">
          <p className="eyebrow">Фасады</p>
          <h2>Как дом выглядит снаружи</h2>
          <div className="pp__bento">
            {PREVIEW_PROJECT.exteriors.map((src, index) => (
              <figure key={src} className={index === 0 ? "pp__bento-lead" : ""}>
                <Image
                  src={src}
                  alt=""
                  width={1600}
                  height={1000}
                  sizes={index === 0 ? "(min-width: 900px) 66vw, 100vw" : "33vw"}
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Планировка. План слева, комнаты списком справа: у каждой
             площадь и число кадров. Нажатие ведёт в интерьеры этой
             комнаты — плана без интерьеров мало, а интерьеров без плана
             непонятно. */}
      <section className="section pp__section" id="plan">
        <div className="section__inner">
          <p className="eyebrow">Планировка</p>
          <h2>{floor.label}</h2>
          <div className="pp__plan">
            <div className="pp__plan-media">
              <Image
                src={floor.plan}
                alt={`План: ${floor.label}`}
                width={1400}
                height={1000}
                sizes="(min-width: 900px) 55vw, 100vw"
              />
            </div>
            <ul className="pp__rooms">
              {floor.rooms.map((r) => {
                const count = PREVIEW_INTERIORS.filter(
                  (i) => i.room === r.id,
                ).length;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={
                        room === r.id ? "pp__room pp__room--on" : "pp__room"
                      }
                      onClick={() => pickRoom(r.id)}
                    >
                      <span className="pp__room-name">{r.name}</span>
                      <span className="pp__room-area">{r.area}</span>
                      <span className="pp__room-go">
                        {count} фото
                        <IconArrowUpRight size={14} stroke={2} aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Интерьеры — те же комнаты, что на плане, только переключателем.
             Выбор общий с планировкой: нажатие там меняет ряд здесь. */}
      <section
        className="section section--muted pp__section"
        id="interiors"
        ref={interiorsRef}
      >
        <div className="section__inner">
          <p className="eyebrow">Интерьеры</p>
          <h2>Возможные варианты отделки</h2>
          <div className="pp__filters">
            <button
              type="button"
              className={room === null ? "pp__chip pp__chip--on" : "pp__chip"}
              onClick={() => setRoom(null)}
            >
              Все комнаты
            </button>
            {floor.rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                className={room === r.id ? "pp__chip pp__chip--on" : "pp__chip"}
                onClick={() => setRoom(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="pp__shots">
            {shots.map((shot) => (
              <figure key={shot.src}>
                <Image
                  src={shot.src}
                  alt=""
                  width={1400}
                  height={1000}
                  sizes="(min-width: 900px) 33vw, 50vw"
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Комплектации — три уровня, а не набор галочек: человек выбирает
             готовый состав. Выбор меняет цену и платёж в липкой панели,
             а подробный состав материалов лежит в аккордеоне — тем же,
             что на страницах ипотеки. */}
      <section className="section pp__section" id="config">
        <div className="section__inner">
          <p className="eyebrow">Комплектация</p>
          <h2>Варианты комплектаций</h2>
          <div className="pp__config">
            <div className="pp__config-main">
              <ul className="pp__tiers">
                {PREVIEW_TIERS.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={
                        t.id === tierId ? "pp__tier pp__tier--on" : "pp__tier"
                      }
                      onClick={() => setTierId(t.id)}
                      aria-pressed={t.id === tierId}
                    >
                      <span className="pp__tier-name">{t.name}</span>
                      <span className="pp__tier-lead">{t.lead}</span>
                      <span className="pp__tier-price">
                        от {t.price.toLocaleString("ru-RU")}
                      </span>
                      <span className="pp__tier-list">
                        {t.includes.map((item) => (
                          <span key={item}>
                            <IconCheck size={14} stroke={2.4} aria-hidden="true" />
                            {item}
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <h3 className="pp__details-title">
                Подробнее о составе и материалах
              </h3>
              <Accordion
                type="multiple"
                className="ui-accordion pp__details"
              >
                {tier.details.map((d) => (
                  <AccordionItem key={d.title} value={`${tier.id}-${d.title}`}>
                    <AccordionTrigger>{d.title}</AccordionTrigger>
                    <AccordionContent>{d.text}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <aside className="pp__total">
              <p className="pp__total-label">{tier.name} комплектация</p>
              <p className="pp__total-sum">{rub(total)}</p>
              <p className="pp__total-pay">
                {rub(monthly)} в месяц
                <span>семейная ипотека, взнос 20%, 30 лет</span>
              </p>
              <button type="button" className="btn btn-yellow">
                Получить расчёт
                <IconArrowUpRight size={16} stroke={2} aria-hidden="true" />
              </button>
              <p className="pp__total-note">
                Цена предварительная: точную стоимость считает инженер после
                выезда на участок.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
