"use client";
import type { ComponentProps } from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { IconX } from "@tabler/icons-react";
// shadcn/ui Radix composition, adapted to the existing plain CSS design system.
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export const DialogTitle = Primitive.Title;
export const DialogDescription = Primitive.Description;
export function DialogContent({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="comparison-overlay" />
      <Primitive.Content
        data-slot="dialog-content"
        className={`comparison-dialog ${className}`}
        {...props}
      >
        {children}
        <Primitive.Close
          className="comparison-close"
          aria-label="Закрыть сравнение"
        >
          <IconX size={22} />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
