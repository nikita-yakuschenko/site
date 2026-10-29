'use client'

import type { ComponentProps } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { IconCheck } from '@tabler/icons-react'
import './checkbox.css'

/** shadcn/ui Radix composition with the project's CSS tokens and Tabler icons. */
export function Checkbox({ className = '', ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={`ui-checkbox ${className}`} {...props}>
    <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="ui-checkbox__indicator"><IconCheck size={14} stroke={2} aria-hidden="true" /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
}
