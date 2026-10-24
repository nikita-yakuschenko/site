'use client'
import { useDocumentInfo } from '@payloadcms/ui'
import { useState } from 'react'
import { Button } from '../ui/button'
export function AutomationJobActions() {
  const { data, id } = useDocumentInfo(), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  const action = data?.status === 'failed' ? 'retry' : data?.status === 'queued' ? 'cancel' : null
  return <div className="shadcn-surface flex flex-col gap-3">{action && <Button type="button" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const response = await fetch(`/api/automation/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(action === 'retry' ? 'Задание возвращено в очередь' : 'Задание отменено') } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) } }}>{action === 'retry' ? 'Повторить обработку' : 'Отменить задание'}</Button>}<p role="status" className="text-sm">{message}</p></div>
}
export function RegistrationEmailActions() {
  const { data, id, collectionSlug } = useDocumentInfo(), [message, setMessage] = useState(''), [busy, setBusy] = useState(false)
  if (!id || !data?.email || ['blocked', 'cancelled'].includes(data.status)) return null
  return <div className="shadcn-surface flex flex-col gap-3"><Button type="button" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { const response = await fetch('/api/automation/registration-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ flow: collectionSlug === 'referral-participants' ? 'referral' : 'event', id, requestId: crypto.randomUUID() }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage('Письмо поставлено в очередь') } catch (error) { setMessage((error as Error).message) } finally { setBusy(false) } }}>{data.status === 'pending' ? 'Отправить новую ссылку подтверждения' : collectionSlug === 'referral-participants' ? 'Отправить код и ссылку участника' : 'Отправить программу мероприятия'}</Button><p role="status" className="text-sm">{message}</p></div>
}
