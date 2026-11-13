import { getPayload } from 'payload'
import { randomUUID } from 'node:crypto'
import config from '@payload-config'
import { readTextLimited } from '../../../../../../src/lib/request-security'
import { requireCMSRequestLimit } from '../../../../config/request-limits'
import { safeRequestError } from '../../../../config/safe-request-error'
import { equalSecret } from '../../../../automation/crypto'
import { enqueue, saveSettings, settings } from '../../../../automation/store'
import { bitrixAuth, bitrixCall, connectorId, connectorName, lineChannelName, messageRows, messageServiceSenders, parseBitrixBody, parseCrmMessageSend, placementLine, portalDomain, registerParams, type BitrixAuth } from '../../../../messengers/bitrix-connector'
import { accountViews, beginLogin, deliverCrmMessage, disconnectAccount, startOutgoing, submitPassword } from '../../../../messengers/gateway'
import { bindLine, channelLine, lineChannel, unbindLine } from '../../../../messengers/lines'
import { isMessengerChannel, type MessengerChannel } from '../../../../messengers/phone'
import { panelMarkup, settingsMarkup } from '../../../../messengers/settings-page'

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
    if (installing) return await install(payload, auth)
    if (auth.domain !== portalDomain) return Response.json({ error: 'Неверный портал' }, { status: 403 })
    if (route === 'connect') return await connectApi(payload, auth, body)
    if (String(body.PLACEMENT || '') === 'SETTING_CONNECTOR' || String(body.authorize || '') === '1') return await settingsPage(payload, auth, body)
    if (String(body.event || '').toUpperCase() === 'ONIMCONNECTORMESSAGEADD') return await operatorReply(payload, auth, body)
    const crmMessage = parseCrmMessageSend(body)
    if (crmMessage) return await crmMessageSend(payload, auth, crmMessage)
    return Response.json({ accepted: true, ignored: true })
  } catch (error) { return safeRequestError(error, data => console.error(data)) }
}

async function install(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth) {
  if (!auth.accessToken || auth.domain !== portalDomain) return page('Откройте установку из карточки приложения в Битрикс24.', false)
  const requestId = randomUUID()
  const started = Date.now()
  let stage = 'user.admin'
  const log = (outcome: string, code?: string) => {
    console.info(JSON.stringify({ component: 'messengers-install', requestId, stage, outcome, code, elapsedMs: Date.now() - started }))
  }
  try {
    if (await bitrixCall<boolean>(auth.domain, auth.accessToken, 'user.admin') !== true) {
      log('denied')
      return page('Установку должен выполнить администратор Битрикс24.', false)
    }
    log('ok')
    stage = 'imconnector.register'
    await bitrixCall(auth.domain, auth.accessToken, 'imconnector.register', registerParams(handlerUrl()))
    log('ok')
    stage = 'event.bind'
    await bitrixCall(auth.domain, auth.accessToken, 'event.bind', { event: 'OnImConnectorMessageAdd', handler: handlerUrl() })
    log('ok')
    stage = 'messageservice.sender.add'
    const crmChannels = await registerMessageSenders(auth.domain, auth.accessToken)
    log(crmChannels ? 'ok' : 'skipped', crmChannels ? undefined : 'insufficient_scope')
    stage = 'save-auth'
    await remember(payload, auth)
    log('ok')
  } catch (error) {
    const failure = error instanceof Error ? error.message : 'Error'
    const code = /^(?:[A-Z][A-Z0-9_]{1,63}|[45]\d\d)$/.test(failure) ? failure : undefined
    log('failed', code)
    return page(`Не удалось завершить установку (${stage}${code ? `: ${code}` : ''}). Код проверки: ${requestId}.`, false)
  }
  return page('Канал зарегистрирован. Откройте его в контакт-центре. Каналы для сделки появляются после права messageservice.', true)
}

async function settingsPage(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const token = await administratorToken(auth)
  if (!token) return Response.json({ error: 'Требуется действующая сессия администратора Битрикс24' }, { status: 403 })
  const { connector, line } = placementLine(body)
  if (connector && connector !== connectorId) return page('Это другой канал', false)
  // Повторная регистрация каналов сделки без полной переустановки приложения.
  await registerMessageSenders(auth.domain, token).catch(error => {
    console.error(`messenger-crm-senders ${error instanceof Error ? error.message.slice(0, 200) : 'Error'}`)
  })
  if (line) {
    await bitrixCall(auth.domain, token, 'imconnector.activate', { CONNECTOR: connectorId, LINE: line, ACTIVE: 1 })
    await publishLineName(payload, auth.domain, token, line)
  }
  const channel = await lineChannel(payload, line)
  const view = channel ? accountViews().find(item => item.channel === channel) : undefined
  return html(settingsMarkup(line, channel, view, { AUTH_ID: token, DOMAIN: auth.domain }))
}

async function crmMessageSend(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, message: NonNullable<ReturnType<typeof parseCrmMessageSend>>) {
  const saved = await settings(payload)
  const member = saved.secret('messengerMemberId')
  const applicationToken = saved.secret('messengerApplicationToken')
  if (!member || auth.memberId !== member) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  if (applicationToken && auth.applicationToken && !equalSecret(applicationToken, auth.applicationToken)) {
    return Response.json({ error: 'Нет доступа' }, { status: 401 })
  }
  try {
    await deliverCrmMessage(payload, message)
    return Response.json({ accepted: true })
  } catch (error) {
    const hint = error instanceof Error ? error.message.slice(0, 200) : 'Ошибка отправки'
    console.error(`messenger-crm-send ${hint}`)
    return Response.json({ accepted: false, error: hint }, { status: 200 })
  }
}

async function registerMessageSenders(domain: string, token: string) {
  try {
    for (const sender of messageServiceSenders(handlerUrl())) {
      // Сначала add (идемпотентно), затем update — иначе пустое имя «через» остаётся навсегда.
      await bitrixCall(domain, token, 'messageservice.sender.add', sender)
      await bitrixCall(domain, token, 'messageservice.sender.update', {
        CODE: sender.CODE,
        HANDLER: sender.HANDLER,
        NAME: sender.NAME,
        DESCRIPTION: sender.DESCRIPTION,
      })
    }
    return true
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'insufficient_scope' || code === 'ACCESS_DENIED') return false
    throw error
  }
}

async function operatorReply(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const saved = await settings(payload)
  const member = saved.secret('messengerMemberId')
  const applicationToken = saved.secret('messengerApplicationToken')
  if (!member || auth.memberId !== member) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  if (!applicationToken || !auth.applicationToken || !equalSecret(applicationToken, auth.applicationToken)) return Response.json({ error: 'Нет доступа' }, { status: 401 })
  for (const row of messageRows(body)) {
    const key = `messenger:${row.line}:${row.bitrixMessageId}`
    await enqueue(payload, 'messenger-reply', row, key)
  }
  return Response.json({ accepted: true })
}

async function connectApi(payload: Awaited<ReturnType<typeof getPayload>>, auth: BitrixAuth, body: Record<string, unknown>) {
  const token = await administratorToken(auth)
  if (!token) return Response.json({ error: 'Требуется действующая сессия администратора Битрикс24' }, { status: 403 })
  const line = Number(body.line)
  if (!Number.isInteger(line) || line <= 0) return Response.json({ error: 'Линия не выбрана' }, { status: 400 })
  const action = String(body.action || 'status')
  const requested = String(body.channel || '')
  let notice = ''
  if (action === 'bind') {
    if (!isMessengerChannel(requested)) return Response.json({ error: 'Неизвестный мессенджер' }, { status: 400 })
    const previousLine = await channelLine(payload, requested)
    notice = await bindLine(payload, line, requested)
    notice = await rememberLineName(payload, auth.domain, token, line, notice)
    if (previousLine && previousLine !== line) await rememberLineName(payload, auth.domain, token, previousLine, '')
  } else if (action === 'unbind') {
    const bound = await lineChannel(payload, line)
    if (bound && accountViews().find(item => item.channel === bound)?.status === 'on') notice = 'Сначала отключите рабочий номер.'
    else {
      await unbindLine(payload, line)
      notice = await rememberLineName(payload, auth.domain, token, line, notice)
    }
  } else {
    const channel = await lineChannel(payload, line)
    if (!channel) return Response.json({ panel: await renderPanel(payload, line, 'Сначала выберите мессенджер этой линии.') }, { headers: { 'Cache-Control': 'no-store' } })
    notice = await runLineAction(payload, channel, action, body)
  }
  return Response.json({ panel: await renderPanel(payload, line, notice) }, { headers: { 'Cache-Control': 'no-store' } })
}

async function runLineAction(payload: Awaited<ReturnType<typeof getPayload>>, channel: MessengerChannel, action: string, body: Record<string, unknown>) {
  if (action === 'start') { await beginLogin(payload, channel, { fresh: true }); return '' }
  if (action === 'logout') { await disconnectAccount(payload, channel); return '' }
  if (action === 'password') { submitPassword(channel, String(body.password || '')); return '' }
  if (action === 'send') {
    try { await startOutgoing(payload, channel, String(body.phone || ''), String(body.text || '')); return '' }
    catch (error) { return error instanceof Error ? error.message : 'Сообщение не отправлено' }
  }
  return ''
}

async function rememberLineName(payload: Awaited<ReturnType<typeof getPayload>>, domain: string, token: string, line: number, notice: string) {
  try { await publishLineName(payload, domain, token, line) } catch (error) {
    console.error(`messenger-line-name ${error instanceof Error ? error.message.slice(0, 200) : 'Error'}`)
    return notice || 'Линия обновлена, имя в контакт-центре не записалось.'
  }
  return notice
}

async function publishLineName(payload: Awaited<ReturnType<typeof getPayload>>, domain: string, token: string, line: number) {
  const channel = await lineChannel(payload, line)
  await bitrixCall(domain, token, 'imconnector.connector.data.set', {
    CONNECTOR: connectorId,
    LINE: line,
    DATA: { ID: connectorId, NAME: lineChannelName(channel), URL: 'https://avgst.ru', URL_IM: 'https://avgst.ru' },
  })
}

async function renderPanel(payload: Awaited<ReturnType<typeof getPayload>>, line: number, notice = '') {
  const channel = await lineChannel(payload, line)
  return panelMarkup(line, channel, channel ? accountViews().find(item => item.channel === channel) : undefined, notice)
}

async function administratorToken(auth: BitrixAuth) {
  if (!auth.accessToken) return ''
  try {
    return await bitrixCall<boolean>(auth.domain, auth.accessToken, 'user.admin') === true ? auth.accessToken : ''
  } catch { return '' }
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

function html(body: string) {
  return new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}
