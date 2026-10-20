'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import styles from './form-success-animation.module.css'

type Props = {
  active: boolean
  title?: string
  description?: string
  className?: string
  onComplete?: () => void
}

const colors = ['#4ade80', '#22c55e', '#86efac', '#bbf7d0', '#fcc90c', '#a3e635']
const particles = Array.from({ length: 42 }, (_, index) => {
  const angle = index * Math.PI * 2 / 42
  const radius = index % 2 ? 112 : 76
  return {
    '--x': `${Math.cos(angle) * radius}px`,
    '--y': `${Math.sin(angle) * radius}px`,
    '--size': `${2 + (index * 7 % 10) / 2}px`,
    '--color': colors[index % colors.length],
    '--delay': `${950 + index % 7 * 18}ms`,
  } as CSSProperties
})

export function FormSuccessAnimation({ active, title = 'Спасибо! Заявка принята', description = 'Мы свяжемся с вами в ближайшее время.', className = '', onComplete }: Props) {
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete }, [onComplete])
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => complete.current?.(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3500)
    return () => window.clearTimeout(timer)
  }, [active])

  if (!active) return null
  return <div className={`${styles.root} ${className}`} role="status" aria-live="polite" aria-atomic="true">
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.glow} />
      <img className={styles.logo} src="/logo-success.svg" alt="" width={72} height={72} />
      <svg className={styles.check} viewBox="0 0 72 72" fill="none">
        <circle className={styles.circle} cx="36" cy="36" r="27" pathLength="1" />
        <path className={styles.tick} d="m24 36 8 8 16-17" pathLength="1" />
      </svg>
      {particles.map((style, index) => <i key={index} className={styles.particle} style={style} />)}
    </div>
    <div className={styles.copy}>
      <p className={styles.title}>{title}</p>
      <p className={styles.description}>{description}</p>
    </div>
  </div>
}
