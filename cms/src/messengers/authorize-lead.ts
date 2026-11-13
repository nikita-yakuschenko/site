import type { Payload } from 'payload'
import { saveSettings, settings } from '../automation/store'
import { refreshMessengerAuth } from './bitrix-connector'

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
