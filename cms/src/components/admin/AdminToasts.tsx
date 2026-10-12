'use client'

import type { ReactNode } from 'react'
import { Toaster } from '../ui/sonner'

export function AdminToasts({ children }: { children?: ReactNode }) {
  return <>{children}<Toaster position="bottom-right" closeButton richColors={false} /></>
}
