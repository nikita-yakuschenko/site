import { waitForRoistatVisit } from './roistat-visit'

export type LeadAttempt = { current: { payload: string; requestId: string } | null }

/** Один ключ на неизменённые данные, включая повтор после обрыва ответа. */
export async function submitLead(payload: Record<string, unknown>, attempt: LeadAttempt, request: typeof fetch = fetch) {
  const serialized = JSON.stringify(payload)
  if (attempt.current?.payload !== serialized) attempt.current = { payload: serialized, requestId: crypto.randomUUID() }
  const visit = await waitForRoistatVisit()
  const meta = payload.meta && typeof payload.meta === 'object' && !Array.isArray(payload.meta) ? payload.meta : {}
  const response = await request('/next/leads', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, ...(visit ? { meta: { ...meta, roistatVisit: visit } } : {}), requestId: attempt.current.requestId }),
    signal: AbortSignal.timeout(20000),
  })
  const receipt = await response.json()
  if (!response.ok || receipt.accepted !== true) throw new Error('lead-not-confirmed')
  return receipt as { accepted: true; id: string }
}
