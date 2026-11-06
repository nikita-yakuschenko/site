"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { PanelLeadForm } from "./panel-lead-form";
import { RangeSlider } from "./range-slider";
import { noAutofillFieldProps } from "../lib/no-autofill";
import { copy } from "../lib/copy";

const phrases = [
  "Хочу террасу побольше, чтобы по утрам наслаждаться ароматным кофе.",
  "Хочу гостиную побольше, чтобы собираться всей семьёй за одним большим столом.",
  "Хочу отдельный кабинет и сауну, чтобы работать дома и париться, не выезжая никуда.",
  "Хочу две детские рядом, а нашу спальню тихую и подальше от гостиной.",
  "Хочу кухню отдельно от гостиной: готовлю часто, а запахи по всему дому не хочу.",
  "Хочу комнату для гостей, чтобы родители оставались на выходные и не спали на диване.",
  "Хочу гардеробную и постирочную рядом с санузлом, чтобы вещи не жили по стульям.",
  "Хочу тёплый тамбур на входе, чтобы зимой холод оставался за дверью.",
  "Хочу второй свет над гостиной и широкое окно прямо на террасу.",
  "Хочу спальню со своим санузлом и окном в сад, а не в сторону дороги.",
];

const areaMin = 40;
const areaMax = 200;

function toggle(current: number[], value: number) {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b);
}

/**
 * Карточка под экспликацией: человек отмечает площадь и комнаты так же,
 * как в фильтрах каталога, и пишет, что хочет изменить.
 */
export function PlanChangePrompt({ planLabel }: { planLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [phrase] = useState(() => phrases[Math.floor(Math.random() * phrases.length)]!);
  const [area, setArea] = useState<[number, number]>([areaMin, areaMax]);
  const [areaMoved, setAreaMoved] = useState(false);
  const [floors, setFloors] = useState<number[]>([]);
  const [bedrooms, setBedrooms] = useState<number[]>([]);
  const [bathrooms, setBathrooms] = useState<number[]>([]);
  const [wish, setWish] = useState("");

  const lines = [
    planLabel ? `Планировка: ${planLabel}` : "",
    areaMoved ? `Площадь: ${area[0]}-${area[1]} м²` : "",
    floors.length ? `Этажи: ${floors.join(", ")}` : "",
    bedrooms.length ? `Спальни: ${bedrooms.join(", ")}` : "",
    bathrooms.length ? `Санузлы: ${bathrooms.join(", ")}` : "",
    wish.trim(),
  ].filter(Boolean);

  return (
    <div className="plan-change" data-form={open ? "true" : "false"}>
      {open ? <button type="button" className="plan-change__close" aria-label={copy.close} onClick={() => setOpen(false)}><IconX size={14} stroke={2.4} aria-hidden="true" /></button> : null}
      <p className="plan-change__title">Изменить планировку</p>
      <p className="plan-change__text">Коробка дома остаётся. Отметьте площадь и комнаты и напишите, что хотите поменять.</p>
      <PanelLeadForm
        animateTrigger
        open={open}
        onOpenChange={setOpen}
        label="Обсудить планировку"
        heading="Изменить планировку"
        submitLabel="Жду звонка"
        successText="Заявка принята. Перезвоним и разберём планировку."
        formId="plan-change"
        meta={{
          planLabel: planLabel || undefined,
          ...(areaMoved ? { areaFrom: area[0], areaTo: area[1] } : {}),
          ...(floors.length ? { floors } : {}),
          ...(bedrooms.length ? { bedrooms } : {}),
          ...(bathrooms.length ? { bathrooms } : {}),
        }}
      >
        <div className="plan-change-form">
          <input type="hidden" name="message" value={lines.join("\n")} />
          <fieldset className="cfilter__group">
            <legend className="cfilter__legend">
              Площадь
              <span>{area[0]}-{area[1]} м²</span>
            </legend>
            <RangeSlider
              min={areaMin}
              max={areaMax}
              value={area}
              labels={["Площадь от", "Площадь до"]}
              onChange={(next) => {
                const lo = next[0] ?? areaMin;
                const hi = next[1] ?? areaMax;
                setArea([lo, hi]);
                setAreaMoved(true);
              }}
            />
          </fieldset>
          <Count legend="Количество этажей" values={[1, 2]} active={floors} onToggle={(value) => setFloors((current) => toggle(current, value))} />
          <Count legend="Количество спален" values={[1, 2, 3, 4]} active={bedrooms} onToggle={(value) => setBedrooms((current) => toggle(current, value))} />
          <Count legend="Количество санузлов" values={[1, 2]} active={bathrooms} onToggle={(value) => setBathrooms((current) => toggle(current, value))} />
          <label className="plan-change-form__wish">
            <span className="cfilter__legend">Что ещё хотите</span>
            <textarea
              rows={4}
              value={wish}
              placeholder={phrase}
              className="ym-disable-keys ym-hide-content"
              {...noAutofillFieldProps}
              onChange={(event) => setWish(event.target.value)}
            />
          </label>
        </div>
      </PanelLeadForm>
    </div>
  );
}

function Count({ legend, values, active, onToggle }: { legend: string; values: number[]; active: number[]; onToggle: (value: number) => void }) {
  return (
    <fieldset className="cfilter__group">
      <legend className="cfilter__legend">{legend}</legend>
      <div className="cfilter__badges">
        {values.map((value) => (
          <button key={value} type="button" className={active.includes(value) ? "is-on" : undefined} aria-pressed={active.includes(value)} onClick={() => onToggle(value)}>
            {value}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
