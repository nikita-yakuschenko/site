'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { IconBrandTelegram, IconBrandWhatsapp } from '@tabler/icons-react'
import styles from './form-success-animation.module.css'

export type MessengerAction = 'max' | 'telegram' | 'whatsapp'

export type FormSuccessAnimationProps = {
  active: boolean
  title?: string
  description?: string
  className?: string
  onComplete?: () => void
  actionHref?: string
  actionLabel?: string
  actionChannel?: MessengerAction
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

const redirectSeconds = 5

function redirectLine(seconds: number) {
  const mod10 = seconds % 10
  const mod100 = seconds % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'секунду' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'секунды' : 'секунд'
  return `Вы будете перенаправлены через ${seconds} ${word}`
}

export function FormSuccessAnimationContent({ active, title = 'Спасибо! Заявка принята', description = 'Мы свяжемся с вами в ближайшее время.', className = '', onComplete, actionHref, actionLabel, actionChannel }: FormSuccessAnimationProps) {
  const complete = useRef(onComplete)
  const left = useRef(false)
  const [seconds, setSeconds] = useState(redirectSeconds)
  useEffect(() => { complete.current = onComplete }, [onComplete])
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => complete.current?.(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3500)
    return () => window.clearTimeout(timer)
  }, [active])
  useEffect(() => {
    if (!active || !actionHref) return
    const started = performance.now()
    const timer = window.setInterval(() => {
      const remain = Math.ceil((redirectSeconds * 1000 - (performance.now() - started)) / 1000)
      if (remain <= 0) {
        window.clearInterval(timer)
        if (!left.current) {
          left.current = true
          window.location.assign(actionHref)
        }
      } else setSeconds(remain)
    }, 200)
    return () => window.clearInterval(timer)
  }, [active, actionHref])
  const go = () => {
    if (left.current || !actionHref) return
    left.current = true
    window.location.assign(actionHref)
  }

  if (!active) return null
  const tone = actionChannel === 'max' ? styles.max : actionChannel === 'telegram' ? styles.telegram : actionChannel === 'whatsapp' ? styles.whatsapp : styles.yellow
  return <div data-form-success-animation className={`${styles.root} ${className}`}>
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.glow} />
      <img className={styles.logo} src="/logo-success.svg" alt="" width={72} height={72} />
      <svg className={styles.check} viewBox="0 0 72 72" fill="none">
        <circle className={styles.circle} cx="36" cy="36" r="27" pathLength="1" />
        <path className={styles.tick} d="m24 36 8 8 16-17" pathLength="1" />
      </svg>
      {particles.map((style, index) => <i key={index} className={styles.particle} style={style} />)}
    </div>
    <div className={`${styles.copy}${actionHref ? ` ${styles.copyNow}` : ''}`}>
      <div role="status">
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
      </div>
      {actionHref && actionLabel ? <a className={`${styles.action} ${tone}`} href={actionHref} onClick={(event) => { event.preventDefault(); go() }}>{actionChannel === 'max' ? <img src="/social/max_light.svg" alt="" width={20} height={20} /> : actionChannel === 'telegram' ? <IconBrandTelegram size={20} stroke={1.8} aria-hidden="true" /> : actionChannel === 'whatsapp' ? <IconBrandWhatsapp size={20} stroke={1.8} aria-hidden="true" /> : null}{actionLabel}</a> : null}
      {actionHref ? <p className={styles.countdown} aria-live="polite">{redirectLine(seconds)}</p> : null}
    </div>
  </div>
}
