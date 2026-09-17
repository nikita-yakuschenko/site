"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { IconArrowUpRight } from "@tabler/icons-react";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from "react";

/** Accordion на Radix — тот же примитив, что у shadcn/ui, без Tailwind. */
const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Item>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={["ui-accordion__item", className].filter(Boolean).join(" ")}
    {...props}
  >
    {/* Знак состояния — крупная стрелка позади строки: свёрнутый пункт
        показывает её вниз-вправо, раскрытый поворачивает вверх-вправо.
        Мелкого шеврона рядом нет: два указателя одного состояния спорили
        бы друг с другом. */}
    <IconArrowUpRight
      className="ui-accordion__mark"
      size={88}
      stroke={1.75}
      aria-hidden="true"
    />
    {children}
  </AccordionPrimitive.Item>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="ui-accordion__header">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={["ui-accordion__trigger", className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = forwardRef<
  ComponentRef<typeof AccordionPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, onClick, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={["ui-accordion__content", className].filter(Boolean).join(" ")}
    /* Раскрытый пункт сворачивается кликом в любое место, а не только по
       заголовку: текст занимает почти всю его высоту, и попадать обратно
       в узкую строку заголовка неудобно.

       Выделение при этом не ломается — если что-то выделено, клик его не
       схлопывает, иначе пункт закрывался бы на отпускании мыши посреди
       фразы и скопировать её стало бы нельзя.

       Нажатие адресуется самому заголовку, поэтому клавиатура и экранные
       читалки работают как работали: доступный элемент здесь один, а это
       дубль для мыши. */
    onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      event.currentTarget
        .closest(".ui-accordion__item")
        ?.querySelector<HTMLButtonElement>(".ui-accordion__trigger")
        ?.click();
    }}
    {...props}
  >
    <div className="ui-accordion__content-inner">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
