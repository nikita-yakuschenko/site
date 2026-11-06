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
    /* monitoring must never break the admin */
  }
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
