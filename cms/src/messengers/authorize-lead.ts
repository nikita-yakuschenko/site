import type { Payload } from 'payload'
import type { LeadInput } from '../../../src/lib/leads'
import { saveSettings, settings } from '../automation/store'
import { bitrixCall, connectorId, messengerSession, portalDomain, refreshMessengerAuth } from './bitrix-connector'

export async function currentMessengerToken(payload: Payload) {
  const saved = await settings(payload)
  const access = saved.secret('messengerAccessToken')
  const refresh = saved.secret('messengerRefreshToken')
  const expires = Number(saved.secret('messengerTokenExpires') || 0)
  if (access && expires > Date.now() + 60_000) return access
  const next = await refreshMessengerAuth(refresh || '')
  if (next) {
    await saveSettings(payload, saved.config, {
      messengerAccessToken: next.accessToken,
      messengerRefreshToken: next.refreshToken,
      messengerTokenExpires: String(next.expiresAt),
    })
    return next.accessToken
  }
  if (!access) throw new Error('Канал ещё не установлен')
  return access
}

// Открывает диалог с телефоном клиента. Битрикс авторизует сессию, когда у пользователя есть номер.
export async function authorizeMessengerLead(payload: Payload, lead: Pick<LeadInput, 'phone' | 'meta' | 'requestId'>) {
  const channel = typeof lead.meta?.channel === 'string' ? lead.meta.channel : ''
  const project = typeof lead.meta?.projectName === 'string' ? lead.meta.projectName : ''
  const text = [`Заявка с сайта.`, project ? `Проект: ${project}.` : ''].filter(Boolean).join(' ')
  const message = messengerSession(channel, lead.phone, `lead-${lead.requestId || Date.now()}`, text)
  if (!message) return 'skipped' as const
  const saved = await settings(payload)
  const line = Number(saved.secret('messengerLineId'))
  if (!Number.isInteger(line) || line <= 0) return 'skipped' as const
  const token = await currentMessengerToken(payload)
  await bitrixCall(portalDomain, token, 'imconnector.send.messages', { CONNECTOR: connectorId, LINE: line, MESSAGES: [message] })
  return 'sent' as const
}
