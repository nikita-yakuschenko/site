"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import "./radio-group.css";

// shadcn/ui new-york RadioGroup: registry structure, with CSS instead of Tailwind.
const RadioGroup = React.forwardRef<React.ComponentRef<typeof RadioGroupPrimitive.Root>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(
  ({ className = "", ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={`ui-radio-group ${className}`} {...props} />,
);
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<React.ComponentRef<typeof RadioGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(
  ({ className = "", ...props }, ref) => (
    <RadioGroupPrimitive.Item ref={ref} className={`ui-radio ${className}`} {...props}>
      <RadioGroupPrimitive.Indicator className="ui-radio-mark" />
    </RadioGroupPrimitive.Item>
  ),
);
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };
