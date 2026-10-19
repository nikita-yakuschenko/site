"use client";
import type { ComponentProps } from "react";
import * as Primitive from "@radix-ui/react-popover";
// shadcn/ui Radix composition, retaining the incumbent CSS and icon system.
export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverClose = Primitive.Close;
export function PopoverContent({
  className = "",
  container,
  ...props
}: ComponentProps<typeof Primitive.Content> & {
  container?: HTMLElement | null;
}) {
  return (
    <Primitive.Portal container={container}>
      <Primitive.Content
        data-slot="popover-content"
        sideOffset={8}
        collisionPadding={16}
        className={`comparison-popover ${className}`}
        {...props}
      />
    </Primitive.Portal>
  );
}
