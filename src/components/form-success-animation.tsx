'use client'

import { lazy, Suspense } from 'react'
import type { FormSuccessAnimationProps } from './form-success-animation-content'

function Receipt({ className, title = 'Спасибо! Заявка принята', description = 'Мы свяжемся с вами в ближайшее время.' }: FormSuccessAnimationProps) {
  return <div className={className} role="status" aria-live="polite" aria-atomic="true"><p>{title}</p><p>{description}</p></div>
}

const AnimatedSuccess = lazy(() => import('./form-success-animation-content')
  .then(module => ({ default: module.FormSuccessAnimationContent }))
  .catch(() => ({ default: Receipt })))

/** A receipt is visible immediately; its animation and CSS load only on success. */
export function FormSuccessAnimation(props: FormSuccessAnimationProps) {
  if (!props.active) return null
  const fallback = <Receipt {...props} />
  return <Suspense fallback={fallback}><AnimatedSuccess {...props} /></Suspense>
}
