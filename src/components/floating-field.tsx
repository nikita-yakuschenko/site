import type { ReactNode } from 'react'

export function FloatingField({ label, labelId, className, children }: {
  label: string
  labelId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={className ? `floating-field ${className}` : 'floating-field'}>
      {children}
      <span className="floating-field__label" id={labelId}>{label}</span>
    </label>
  )
}
