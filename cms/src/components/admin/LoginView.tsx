import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { getSafeRedirect } from 'payload/shared'
import { LoginForm } from './LoginForm'

export function LoginView({ initPageResult, searchParams }: AdminViewServerProps) {
  const destination = getSafeRedirect({ fallbackTo: '/', redirectTo: searchParams?.redirect ?? '/' })
  if (initPageResult.req.user) redirect(destination)
  return <LoginForm redirectTo={destination} />
}
