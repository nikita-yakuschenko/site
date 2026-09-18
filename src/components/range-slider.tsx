"use client";

import * as Slider from "@radix-ui/react-slider";

/**
 * Ползунок. Один на весь сайт.
 *
 * Появился потому, что их стало два: калькулятор ипотеки рисовал нативный
 * input[type=range] с accent-color, то есть системный вид операционной
 * системы, а отбор в каталоге свой. Рядом это читалось как два разных
 * сайта. Любой новый ползунок берётся отсюда, а не собирается заново.
 *
 * Радикс, а не нативный инпут: две ручки на одной дорожке нативно не
 * делаются, а клавиатура и ARIA нужны обеим.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  label,
  labels,
}: {
  min: number;
  max: number;
  step?: number;
  /** Число для одной ручки, пара для диапазона. */
  value: number | [number, number];
  onChange?: (next: number[]) => void;
  /** Отпустили ручку. Здесь уместно писать в адрес, а не на каждом движении. */
  onCommit?: (next: number[]) => void;
  label?: string;
  labels?: [string, string];
}) {
  const values = typeof value === "number" ? [value] : value;
  const thumbs = labels ?? [label ?? "", ""];

  return (
    <Slider.Root
      className="ui-slider"
      min={min}
      max={max}
      step={step}
      value={values}
      minStepsBetweenThumbs={values.length > 1 ? 1 : undefined}
      onValueChange={onChange}
      onValueCommit={onCommit}
    >
      <Slider.Track className="ui-slider__track">
        <Slider.Range className="ui-slider__range" />
      </Slider.Track>
      {values.map((_, index) => (
        <Slider.Thumb
          key={index}
          className="ui-slider__thumb"
          aria-label={thumbs[index] || undefined}
        />
      ))}
    </Slider.Root>
  );
}
