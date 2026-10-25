import { waitForRoistatVisit } from './roistat-visit'
import { trackVkFormSubmit } from './vk-pixel'

export type LeadAttempt = { current: { payload: string; requestId: string } | null }

/** Один ключ на неизменённые данные, включая повтор после обрыва ответа. */
export async function submitLead(payload: Record<string, unknown>, attempt: LeadAttempt, request: typeof fetch = fetch, signal?: AbortSignal) {
  signal?.throwIfAborted()
  // A fresh one-time captcha token must not change the business attempt ID.
  const { captchaToken: _captchaToken, ...identity } = payload
  const serialized = JSON.stringify(identity)
  if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, requestId: crypto.randomUUID() }
  const requestId = attempt.current.requestId
  const visit = await waitForRoistatVisit()
  signal?.throwIfAborted()
  const meta = payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta) ? payload.meta : {}
  const response = await request('/next/leads', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, ...(visit ? { meta: { ...meta, roistatVisit: visit } } : {}), requestId }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
  })
  const receipt = await response.json()
  if (!response.ok || receipt.accepted !== true) throw new Error('lead-not-confirmed')
  trackVkFormSubmit(requestId)
  return receipt as { accepted: true; id: string }
}
