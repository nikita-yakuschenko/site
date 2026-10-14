'use client'

import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import { cn } from 'cn'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'

type ChoiceSelectProps = { value: string; options: Record<string, string>; onChange: (value: string) => void; label: string; className?: string }

// Select that drops below its trigger and keeps the page scrollable while open
export function ChoiceSelect({ value, options, onChange, label, className }: ChoiceSelectProps) {
  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger aria-label={label} className={cn('flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm whitespace-nowrap shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50', className)}>
      <span className="truncate">{options[value] ?? value}</span>
      <IconChevronDown className="size-4 shrink-0 opacity-50" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="min-w-(--radix-dropdown-menu-trigger-width)">
      {Object.entries(options).map(([key, text]) => <DropdownMenuItem key={key} className="pr-8" onSelect={() => onChange(key)}>
        {text}
        {key === value && <IconCheck className="absolute right-2 size-4" />}
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}
