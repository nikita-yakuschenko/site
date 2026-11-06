type Rating = 'good' | 'needs-improvement' | 'poor'

function send(body: Record<string, unknown>) {
  const payload = JSON.stringify(body)
  try {
    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    })
  } catch {
    /* monitoring must never break the page */
  }
}

function rate(name: 'LCP' | 'CLS' | 'INP' | 'TTFB', value: number, rating: Rating) {
  if (rating === 'good' && Math.random() > 0.1) return
  send({
    message: `web-vital ${name} ${Math.round(value)}`,
    type: 'WebVital',
    level: rating === 'poor' ? 'warning' : 'info',
    url: location.href,
    extra: { name, value, rating },
  })
}

window.addEventListener('error', (event) => {
  send({
    message: event.message || 'window.error',
    type: event.error instanceof Error ? event.error.name : 'Error',
    stack: event.error instanceof Error ? event.error.stack : undefined,
    url: location.href,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  send({
    message: reason instanceof Error ? reason.message : String(reason),
    type: reason instanceof Error ? reason.name : 'UnhandledRejection',
    stack: reason instanceof Error ? reason.stack : undefined,
    url: location.href,
  })
})

let lcp = 0
try {
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const last = entries[entries.length - 1]
    if (last) lcp = last.startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })
} catch { /* older browsers */ }

let cls = 0
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      if (!shift.hadRecentInput) cls += shift.value ?? 0
    }
  }).observe({ type: 'layout-shift', buffered: true })
} catch { /* older browsers */ }

let inp = 0
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) inp = Math.max(inp, entry.duration)
  }).observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit)
} catch { /* older browsers */ }

function flushLoadVitals() {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  if (nav) rate('TTFB', nav.responseStart, nav.responseStart <= 800 ? 'good' : nav.responseStart <= 1800 ? 'needs-improvement' : 'poor')
  if (lcp) rate('LCP', lcp, lcp <= 2500 ? 'good' : lcp <= 4000 ? 'needs-improvement' : 'poor')
  rate('CLS', cls, cls <= 0.1 ? 'good' : cls <= 0.25 ? 'needs-improvement' : 'poor')
  if (inp) rate('INP', inp, inp <= 200 ? 'good' : inp <= 500 ? 'needs-improvement' : 'poor')
}

addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushLoadVitals()
}, { once: true })
