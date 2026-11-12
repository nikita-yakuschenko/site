import { getPayload } from 'payload'
import config from '@payload-config'
import { readTextLimited } from '../../../../../../src/lib/request-security'
import { requireCMSRequestLimit } from '../../../../config/request-limits'
import { safeRequestError } from '../../../../config/safe-request-error'
import { equalSecret } from '../../../../automation/crypto'
import { saveSettings, settings } from '../../../../automation/store'
import { bitrixAuth, bitrixCall, connectorId, connectorName, contactCenterPlacement, messageRows, parseBitrixBody, placementLine, portalDomain, registerParams, type BitrixAuth } from '../../../../messengers/bitrix-connector'

export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ path?: string[] }> }
const handlerUrl = () => `${(process.env.CMS_PUBLIC_URL || 'https://cms.avgst.ru').replace(/\/$/, '')}/bitrix/messengers`

export async function GET(_request: Request, context: Context) {
  const { path } = await context.params
  if (path?.join('/') === 'health') return Response.json({ ok: true, name: connectorName })
  return Response.json({ error: 'Не найдено' }, { status: 404 })
}

export async function POST(request: Request, context: Context) {
  const { path } = await context.params
  const route = path?.join('/') || ''
  try {
    const payload = await getPayload({ config })
    await requireCMSRequestLimit(payload, request, 'webhook')
    const body = parseBitrixBody(request.headers.get('content-type'), await readTextLimited(request, 256 * 1024))
    const auth = bitrixAuth(body)
    if (auth.domain !== portalDomain) return Response.json({ error: 'Неверный портал' }, { status: 403 })
    if (route === 'install' || String(body.event || '').toUpperCase() === 'ONAPPINSTALL') return install(payload, auth)
    if (String(body.PLACEMENT || '') === 'CONTACT_CENTER') return connectChannel(payload, auth)
    if (String(body.PLACEMENT || '') === 'SETTING_CONNECTOR') return settingsPage(payload, auth, body)
    if (String(body.event || '').toUpperCase() === 'ONIMCONNECTORMESSAGEADD') return operatorReply(payload, auth, body)
    return Response.json({ accepted: true, ignored: true })
  } catch (error) { return safeRequestError(error, data => console.error(data)) }
}

async function install(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth) {
  if (!auth.accessToken) return page('Не пришёл доступ от Битрикс24', false)
  await bitrixCall(auth.domain, auth.accessToken, 'user.current')
  await remember(payload, auth)
  await bitrixCall(auth.domain, auth.accessToken, 'imconnector.register', registerParams(handlerUrl()))
  for (const event of ['OnImConnectorMessageAdd', 'OnImConnectorMessageUpdate', 'OnImConnectorMessageDelete']) {
    await bitrixCall(auth.domain, auth.accessToken, 'event.bind', { event, handler: handlerUrl() })
  }
  await bitrixCall(auth.domain, auth.accessToken, 'placement.bind', contactCenterPlacement(handlerUrl()))
  return page(`${connectorName} установлен. Плитка появится внизу контакт-центра, в блоке решений от партнёров.`, true)
}

async function connectChannel(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth) {
  const token = await usableToken(payload, auth)
  const saved = await settings(payload)
  let line = Number(saved.secret('messengerLineId'))
  if (!Number.isInteger(line) || line <= 0) {
    line = Number(await bitrixCall(auth.domain, token, 'imopenlines.config.add', { PARAMS: { LINE_NAME: connectorName, ACTIVE: 'Y', CRM: 'Y' } }))
  }
  if (!Number.isInteger(line) || line <= 0) return page('Не удалось создать линию', false)
  await bitrixCall(auth.domain, token, 'imconnector.activate', { CONNECTOR: connectorId, LINE: line, ACTIVE: 1 })
  await bitrixCall(auth.domain, token, 'imconnector.connector.data.set', {
    CONNECTOR: connectorId,
    LINE: line,
    DATA: { ID: connectorId, NAME: connectorName, URL: 'https://avgst.ru', URL_IM: 'https://avgst.ru' },
  })
  await remember(payload, auth, { messengerLineId: String(line) })
  return page(`${connectorName} подключен к линии ${line}.`, false)
}

async function settingsPage(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const token = await usableToken(payload, auth)
  const { connector, line } = placementLine(body)
  if (connector && connector !== connectorId) return page('Это другой канал', false)
  if (!line) return page(`Откройте ${connectorName} в контакт-центре`, false)
  await bitrixCall(auth.domain, token, 'imconnector.activate', { CONNECTOR: connectorId, LINE: line, ACTIVE: 1 })
  await bitrixCall(auth.domain, token, 'imconnector.connector.data.set', {
    CONNECTOR: connectorId,
    LINE: line,
    DATA: { ID: connectorId, NAME: connectorName, URL: 'https://avgst.ru', URL_IM: 'https://avgst.ru' },
  })
  await remember(payload, auth, { messengerLineId: String(line) })
  return page(`${connectorName} подключен к линии ${line}.`, false)
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
    await bitrixCall(auth.domain, auth.accessToken, 'user.current')
    await remember(payload, auth)
    return auth.accessToken
  }
  const saved = await settings(payload)
  const token = saved.secret('messengerAccessToken')
  if (!token) throw new Error('Канал ещё не установлен')
  return token
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

function page(text: string, finish: boolean) {
  const script = finish ? '<script src="https://api.bitrix24.com/api/v1/"></script><script>BX24.init(function(){BX24.installFinish()})</script>' : ''
  return new Response(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>${connectorName}</title><body style="font:16px system-ui;margin:24px"><h1>${connectorName}</h1><p>${text}</p>${script}</body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
