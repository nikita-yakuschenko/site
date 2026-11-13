import { messengerChannels, messengerTitles, readablePhone, type AccountView, type MessengerChannel } from './phone'

const scanHint: Record<MessengerChannel, string> = {
  whatsapp: 'В WhatsApp: Связанные устройства → Привязка устройства.',
  telegram: 'В Telegram: Настройки → Устройства → Подключить устройство.',
  max: 'В MAX: Профиль → Устройства → Войти по QR-коду.',
}

export function settingsMarkup(line: number, channel: MessengerChannel | '', view: AccountView | undefined, auth: Record<string, string>, notice = '') {
  const authJson = JSON.stringify(auth).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Линия мессенджера</title><style>
    body{margin:0;font:15px/1.4 system-ui,sans-serif;color:#1a1a1a;background:#fff}
    .wrap{padding:16px 16px 20px}
    h1{margin:0 0 6px;font-size:20px}
    .lead,.state{margin:0 0 12px;color:#4d5660}
    .choices{display:flex;gap:8px;flex-wrap:wrap}
    button{height:36px;padding:0 12px;border:0;border-radius:8px;background:#fcc90c;font:600 14px system-ui;cursor:pointer}
    button.quiet{background:#eef1f5}
    .card{border:1px solid #e3e7ee;border-radius:12px;padding:12px}
    .row{display:flex;justify-content:space-between;gap:12px;align-items:center}
    h2{margin:0;font-size:16px}
    img{display:block;width:196px;height:196px;margin:10px 0}
    .password,.compose{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
    input{flex:1;min-width:140px;height:36px;border:1px solid #d5dbe3;border-radius:8px;padding:0 10px;font:inherit}
  </style></head><body><div class="wrap">${panelMarkup(line, channel, view, notice)}</div>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <script>
    const auth = ${authJson}
    const lineId = ${Number(line) || 0}
    function fit(){ if (window.BX24 && BX24.fitWindow) BX24.fitWindow() }
    if (window.BX24 && BX24.init) BX24.init(fit)
    window.addEventListener('load', function(){ setTimeout(fit, 50); setTimeout(fit, 400) })
    async function call(action, channel, form){
      const body = new URLSearchParams(auth)
      body.set('action', action)
      body.set('channel', channel || '')
      body.set('line', String(lineId))
      if (form) {
        if (form.phone) body.set('phone', form.phone.value)
        if (form.text) body.set('text', form.text.value)
        if (form.password) body.set('password', form.password.value)
      }
      const response = await fetch('/bitrix/messengers/connect', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      const data = await response.json()
      const panel = document.getElementById('panel')
      if (panel && data.panel) panel.outerHTML = data.panel
      fit()
    }
    setInterval(function(){ if (document.querySelector('[data-wait="1"]')) call('status', document.querySelector('[data-channel]') && document.querySelector('[data-channel]').getAttribute('data-channel')) }, 3000)
  </script></body></html>`
}

export function panelMarkup(line: number, channel: MessengerChannel | '', view: AccountView | undefined, notice = '') {
  const title = line ? `Линия ${line}` : 'Откройте канал из контакт-центра'
  const body = !line ? '<p class="lead">Сначала подключите Avangard Messengers к открытой линии.</p>'
    : !channel ? `<p class="lead">Выберите, какой мессенджер обслуживает эту линию. На каждую линию приходится один мессенджер.</p><div class="choices">${messengerChannels.map(item => `<button type="button" onclick="call('bind','${item}')">${messengerTitles[item]}</button>`).join('')}</div>`
    : card(view || { channel, title: messengerTitles[channel], status: 'off', phone: '', qr: '', hint: '' })
  const note = notice ? `<p class="lead">${escapeHtml(notice)}</p>` : ''
  return `<div id="panel"><h1>${escapeHtml(title)}</h1>${note}${body}</div>`
}

function card(view: AccountView) {
  const waiting = view.status === 'qr' || view.status === 'password'
  const phone = readablePhone(view.phone)
  const state = view.status === 'on' ? `Подключён${phone ? `, ${phone}` : ''}` : view.status === 'qr' ? 'Ждём скан' : view.status === 'password' ? 'Нужен пароль' : view.status === 'error' ? 'Не подключился' : 'Не подключён'
  const hint = view.hint || (view.status === 'on' ? 'Сообщения этой линии уходят и приходят через этот номер.' : scanHint[view.channel])
  const image = view.qr ? `<img alt="Код для входа" src="${escapeHtml(view.qr)}">` : ''
  const password = view.status === 'password' ? `<form class="password" onsubmit="call('password','${view.channel}',this);return false"><input name="password" type="password" autocomplete="current-password" placeholder="Пароль" required><button type="submit">Продолжить</button></form>` : ''
  const compose = view.status === 'on' ? `<form class="compose" onsubmit="call('send','${view.channel}',this);return false"><input name="phone" inputmode="tel" autocomplete="tel" placeholder="Номер клиента" required><input name="text" placeholder="Сообщение" required><button type="submit">Написать первым</button></form>` : ''
  const button = view.status === 'on'
    ? `<button class="quiet" type="button" onclick="call('logout','${view.channel}')">Отключить</button>`
    : `<button type="button" onclick="call('start','${view.channel}')">Подключить</button>`
  const change = view.status === 'on' ? '' : `<button class="quiet" type="button" onclick="call('unbind','${view.channel}')">Другой мессенджер</button>`
  return `<section class="card" data-channel="${view.channel}" data-wait="${waiting ? '1' : '0'}"><div class="row"><div><h2>${escapeHtml(view.title)}</h2><p class="state">${escapeHtml(state)}. ${escapeHtml(hint)}</p></div><div class="choices">${button}${change}</div></div>${image}${password}${compose}</section>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}
