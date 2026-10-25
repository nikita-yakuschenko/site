'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const InvisibleSmartCaptcha = dynamic(
  () => import('@yandex/smart-captcha').then(module => module.InvisibleSmartCaptcha),
  { ssr: false },
)

type Verification = {
  controller: AbortController
  resolve: (token: string) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/** One widget for one validated submission; no idle widgets or background retries. */
export function useLeadCaptcha(active: boolean) {
  const pending = useRef<Verification | null>(null)
  const submission = useRef<AbortController | null>(null)
  const sdkRequested = useRef(false)
  const hiddenTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const mounted = useRef(false)
  const enabled = useRef(active)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [widget, setWidget] = useState<{ siteKey: string; operation: Verification } | null>(null)

  const finish = useCallback((operation: Verification, token?: string, error?: Error) => {
    if (pending.current !== operation) return
    pending.current = null
    clearTimeout(operation.timer)
    clearTimeout(hiddenTimer.current)
    operation.controller.abort()
    if (mounted.current) {
      setWidget(null)
      // The official loader caches failed downloads. Offer an explicit reload
      // if its API never appeared; do not loop automatic download attempts.
      if (!token && sdkRequested.current && !(window as Window & { smartCaptcha?: unknown }).smartCaptcha) setReloadRequired(true)
    }
    if (token?.trim()) operation.resolve(token)
    else operation.reject(error || new Error('Не удалось пройти проверку безопасности'))
  }, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      submission.current?.abort()
      if (pending.current) finish(pending.current, undefined, new Error('Форма закрыта'))
    }
  }, [finish])

  useEffect(() => {
    enabled.current = active
    if (!active) submission.current?.abort()
    if (!active && pending.current) finish(pending.current, undefined, new Error('Форма закрыта'))
  }, [active, finish])

  const verify = useCallback(() => new Promise<string>((resolve, reject) => {
    if (pending.current || !mounted.current || !enabled.current) {
      reject(new Error('Проверка уже выполняется или форма закрыта'))
      return
    }
    const operation: Verification = {
      controller: new AbortController(), resolve, reject,
      timer: setTimeout(() => finish(operation, undefined, new Error('Истекло время проверки безопасности')), 120_000),
    }
    pending.current = operation
    sdkRequested.current = false
    fetch('/api/smartcaptcha-config', { cache: 'no-store', signal: operation.controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Недоступна конфигурация проверки безопасности')
        const data = await response.json()
        if (typeof data.siteKey !== 'string' || !data.siteKey.trim()) throw new Error('Не настроена проверка безопасности')
        if (pending.current === operation && mounted.current) {
          sdkRequested.current = true
          setWidget({ siteKey: data.siteKey, operation })
        }
      })
      .catch(error => finish(operation, undefined, error instanceof Error ? error : new Error(String(error))))
  }), [finish])

  const operation = widget?.operation
  return {
    verify,
    submissionSignal: () => {
      submission.current?.abort()
      submission.current = new AbortController()
      if (!mounted.current || !enabled.current) submission.current.abort()
      return submission.current.signal
    },
    reloadRequired,
    isMounted: () => mounted.current,
    isActive: () => mounted.current && enabled.current,
    widget: widget && operation ? <InvisibleSmartCaptcha
      sitekey={widget.siteKey}
      hideShield
      visible
      language="ru"
      onSuccess={token => finish(operation, token)}
      onNetworkError={() => finish(operation)}
      onJavascriptError={() => finish(operation)}
      onTokenExpired={() => finish(operation)}
      onChallengeHidden={() => {
        if (pending.current !== operation) return
        // Success and hidden can arrive in either order in the same event turn.
        clearTimeout(hiddenTimer.current)
        hiddenTimer.current = setTimeout(() => finish(operation), 0)
      }}
    /> : null,
  }
}
