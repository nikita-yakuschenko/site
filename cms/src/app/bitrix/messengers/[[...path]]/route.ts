import { getPayload } from 'payload'
import config from '@payload-config'
import { readTextLimited } from '../../../../../../src/lib/request-security'
import { requireCMSRequestLimit } from '../../../../config/request-limits'
import { safeRequestError } from '../../../../config/safe-request-error'
import { equalSecret } from '../../../../automation/crypto'
import { saveSettings, settings } from '../../../../automation/store'
import { authorizeMessengerLead, currentMessengerToken } from '../../../../messengers/authorize-lead'
import { bitrixAuth, bitrixCall, connectorId, connectorName, messageRows, messengerChannelNames, messengerSession, parseBitrixBody, placementLine, portalDomain, registerParams, type BitrixAuth } from '../../../../messengers/bitrix-connector'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ path?: string[] }> }
const handlerUrl = () => `${(process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru').replace(/\/$/, '')}/bitrix/messengers`

export async function GET(request: Request, context: Context) {
  const { path } = await context.params
  if (path?.join('/') === 'health') return Response.json({ ok: true, name: connectorName })
  if (path?.join('/') === 'install') return receive(request, 'install')
  return Response.json({ error: 'Не найдено' }, { status: 404 })
}

export async function POST(request: Request, context: Context) {
  const { path } = await context.params
  return receive(request, path?.join('/') || '')
}

async function receive(request: Request, route: string) {
  try {
    const payload = await getPayload({ config })
    await requireCMSRequestLimit(payload, request, 'webhook')
    const query = parseBitrixBody(null, new URL(request.url).searchParams.toString())
    const posted = request.method === 'GET' ? {} : parseBitrixBody(request.headers.get('content-type'), await readTextLimited(request, 256 * 1024))
    const body = { ...query, ...posted }
    const auth = bitrixAuth(body)
    const installing = route === 'install' || String(body.event || '').toUpperCase() === 'ONAPPINSTALL'
    if (auth.domain && auth.domain !== portalDomain) return Response.json({ error: 'Неверный портал' }, { status: 403 })
    if (installing) return install(payload, auth)
    if (auth.domain !== portalDomain) return Response.json({ error: 'Неверный портал' }, { status: 403 })
    if (String(body.PLACEMENT || '') === 'SETTING_CONNECTOR' || String(body.authorize || '') === '1') return settingsPage(payload, auth, body)
    if (String(body.event || '').toUpperCase() === 'ONIMCONNECTORMESSAGEADD') return operatorReply(payload, auth, body)
    return Response.json({ accepted: true, ignored: true })
  } catch (error) { return safeRequestError(error, data => console.error(data)) }
}

async function install(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth) {
  if (!auth.accessToken || auth.domain !== portalDomain) return page('Откройте установку из карточки приложения в Битрикс24.', false)
  try {
    await bitrixCall(auth.domain, auth.accessToken, 'user.current')
    await remember(payload, auth)
    await bitrixCall(auth.domain, auth.accessToken, 'imconnector.register', registerParams(handlerUrl()))
    await bitrixCall(auth.domain, auth.accessToken, 'event.bind', { event: 'OnImConnectorMessageAdd', handler: handlerUrl() })
  } catch (error) {
    const failure = error instanceof Error ? error.message : 'Error'
    console.error(`messengers-install ${failure}`)
    return page(`Канал не зарегистрирован: ${failure}`, false)
  }
  return page('Канал зарегистрирован. Откройте его в контакт-центре.', true)
}

async function settingsPage(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const { connector, line } = placementLine(body)
  if (connector && connector !== connectorId) return page('Это другой канал', false)
  if (line) {
    const token = await usableToken(payload, auth)
    await bitrixCall(auth.domain, token, 'imconnector.activate', { CONNECTOR: connectorId, LINE: line, ACTIVE: 1 })
    await bitrixCall(auth.domain, token, 'imconnector.connector.data.set', {
      CONNECTOR: connectorId,
      LINE: line,
      DATA: { ID: connectorId, NAME: connectorName, URL: 'https://avgst.ru', URL_IM: 'https://avgst.ru' },
    })
    await remember(payload, auth, { messengerLineId: String(line) })
  }
  let notice = line ? `${connectorName} подключен к линии ${line}.` : `Откройте ${connectorName} в контакт-центре.`
  if (String(body.authorize || '') === '1') {
    const phone = String(body.phone || '')
    const channel = String(body.channel || '')
    if (!messengerSession(channel, phone, 'check', 'Заявка с сайта.')) notice = 'Укажите телефон и канал: MAX, Telegram или WhatsApp.'
    else {
      try {
        const result = await authorizeMessengerLead(payload, { phone, requestId: crypto.randomUUID(), meta: { channel } })
        notice = result === 'sent'
          ? `Сессия авторизована: ${messengerChannelNames[channel as keyof typeof messengerChannelNames]}, ${phone}.`
          : 'Сначала откройте канал в контакт-центре и подключите его к линии.'
      } catch (error) {
        const failure = error instanceof Error ? error.message : 'Error'
        console.error(`messengers-authorize ${failure}`)
        notice = `Сессию не удалось авторизовать: ${failure}`
      }
    }
  }
  return page(notice, false, authorizeForm(body, line))
}

async function operatorReply(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const saved = await settings(payload)
  const member = saved.secret('messengerMemberId')
  const applicationToken = saved.secret('messengerApplicationToken')
  if (!member || auth.memberId !== member) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  if (!applicationToken || !auth.applicationToken || !equalSecret(applicationToken, auth.applicationToken)) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  for (const row of messageRows(body)) {
    const key = `messenger:${row.line}:${row.bitrixMessageId}`
    const existing = await payload.find({ collection: 'automation-jobs', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true })
    if (existing.docs[0]) continue
    await payload.create({ collection: 'automation-jobs', data: { key, kind: 'messenger-reply', data: row, status: 'completed', runAt: new Date().toISOString(), attempts: 0, result: { stored: true }, completedAt: new Date().toISOString() }, overrideAccess: true })
  }
  return Response.json({ accepted: true })
}

async function usableToken(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth) {
  if (auth.accessToken) {
    try {
      await bitrixCall(auth.domain, auth.accessToken, 'user.current')
      await remember(payload, auth)
      return auth.accessToken
    } catch { /* Сохранённый токен обновляется ниже. */ }
  }
  return currentMessengerToken(payload)
}

async function remember(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, extra: Record<string, string> = {}) {
  const secrets: Record<string, string> = { ...extra }
  if (auth.accessToken) secrets.messengerAccessToken = auth.accessToken
  if (auth.refreshToken) secrets.messengerRefreshToken = auth.refreshToken
  if (auth.memberId) secrets.messengerMemberId = auth.memberId
  if (auth.applicationToken) secrets.messengerApplicationToken = auth.applicationToken
  if (auth.expiresAt) secrets.messengerTokenExpires = String(auth.expiresAt)
  const saved = await settings(payload)
  await saveSettings(payload, saved.config, secrets)
}

function page(text: string, finish: boolean, extra = '') {
  const script = finish ? '<script src="https://api.bitrix24.com/api/v1/"></script><script>BX24.init(function(){BX24.installFinish()})</script>' : ''
  return new Response(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>${connectorName}</title><body style="font:16px system-ui;margin:24px"><h1>${connectorName}</h1><p>${escapeHtml(text)}</p>${extra}${script}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function authorizeForm(body: Record<string, unknown>, line: number) {
  const hidden = ['AUTH_ID', 'REFRESH_ID', 'DOMAIN', 'member_id', 'application_token'].flatMap(key => {
    const value = body[key]
    return typeof value === 'string' && value ? [`<input type="hidden" name="${key}" value="${escapeHtml(value)}">`] : []
  }).join('')
  const placement = line ? `<input type="hidden" name="PLACEMENT" value="SETTING_CONNECTOR"><input type="hidden" name="PLACEMENT_OPTIONS" value="${escapeHtml(JSON.stringify({ LINE: line, CONNECTOR: connectorId }))}">` : ''
  const options = Object.entries(messengerChannelNames).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')
  return `<form method="post" style="display:grid;gap:12px;max-width:360px"><h2>Авторизовать сессию</h2>${hidden}${placement}<input type="hidden" name="authorize" value="1"><label>Телефон<input name="phone" required inputmode="tel" autocomplete="tel" style="display:block;width:100%;margin-top:4px"></label><label>Канал<select name="channel" required style="display:block;width:100%;margin-top:4px">${options}</select></label><button type="submit">Авторизовать</button></form>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}
