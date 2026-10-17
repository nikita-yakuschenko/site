import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { AdminShell } from './AdminShell'

export async function AdminShellRoot({ children }: { children?: ReactNode }) {
  const saved = (await cookies()).get('sidebar_state')?.value
  const cookieOpen = saved === 'true' ? true : saved === 'false' ? false : undefined
  return <AdminShell cookieOpen={cookieOpen}>{children}</AdminShell>
}
