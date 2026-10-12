"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { IconCheck, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import "./select.css";

// shadcn/ui new-york Select: registry structure, with CSS instead of Tailwind
// and the project's existing icon set.
const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className = "", children, ...props }, ref) => (
    <SelectPrimitive.Trigger ref={ref} className={`ui-select-trigger ${className}`} {...props}>
      {children}
      <SelectPrimitive.Icon asChild><IconChevronDown size={16} stroke={1.5} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  ),
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>>(
  ({ className = "", ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton ref={ref} className={`ui-select-scroll ${className}`} {...props}><IconChevronUp size={16} aria-hidden="true" /></SelectPrimitive.ScrollUpButton>
  ),
);
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>>(
  ({ className = "", ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton ref={ref} className={`ui-select-scroll ${className}`} {...props}><IconChevronDown size={16} aria-hidden="true" /></SelectPrimitive.ScrollDownButton>
  ),
);
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
  ({ className = "", children, position = "popper", sideOffset = 4, ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content ref={ref} className={`ui-select-content ${className}`} position={position} sideOffset={sideOffset} {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="ui-select-viewport">{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  ),
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Label>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>>(
  ({ className = "", ...props }, ref) => <SelectPrimitive.Label ref={ref} className={`ui-select-label ${className}`} {...props} />,
);
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className = "", children, ...props }, ref) => (
    <SelectPrimitive.Item ref={ref} className={`ui-select-item ${className}`} {...props}>
      <span className="ui-select-indicator"><SelectPrimitive.ItemIndicator><IconCheck size={16} stroke={1.5} aria-hidden="true" /></SelectPrimitive.ItemIndicator></span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<React.ComponentRef<typeof SelectPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>>(
  ({ className = "", ...props }, ref) => <SelectPrimitive.Separator ref={ref} className={`ui-select-separator ${className}`} {...props} />,
);
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton };
