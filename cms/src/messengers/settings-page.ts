import { messengerChannels, messengerTitles, readablePhone, type AccountView, type MessengerChannel } from './phone'

const scanHint: Record<MessengerChannel, string> = {
  whatsapp: 'В WhatsApp: Связанные устройства → Привязка устройства.',
  telegram: 'В Telegram: Настройки → Устройства → Подключить устройство.',
  max: 'В MAX: Профиль → Устройства → Войти по QR-коду.',
}

export function settingsMarkup(line: number, channel: MessengerChannel | '', view: AccountView | undefined, auth: Record<string, string>, notice = '') {
  const authJson = JSON.stringify(auth).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Линия мессенджера</title><style>
    @font-face{font-family:Geist;src:url("https://cdn.jsdelivr.net/npm/geist@1.4.2/dist/fonts/geist-sans/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
    body{margin:0;background:#fff;color:#0b1020;font:15px/1.45 Geist,Inter,Arial,sans-serif}
    .wrap{max-width:560px;padding:8px 4px 20px}
    h1{margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-.02em}
    h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em}
    .lead{margin:0 0 14px;color:rgb(11 16 32 / .62)}
    .choices{display:grid;gap:8px}
    .tile{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid rgb(11 16 32 / .08);border-radius:14px;background:#f7f4ea;color:#0b1020;text-align:left;cursor:pointer;font:inherit}
    .tile:hover{border-color:#fcc90c;background:#fff8df}
    .mark{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#fcc90c;color:#0b1020;font-weight:700;flex:none}
    .act{font-size:15px;font-weight:600}
    .card{margin-top:4px}
    .row{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
    .state{margin:6px 0 0;color:rgb(11 16 32 / .62)}
    .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    img{display:block;width:196px;height:196px;margin:12px 0;border-radius:12px;background:#fff}
    .go,.password button,.compose button{height:40px;padding:0 14px;border:0;border-radius:10px;background:#fcc90c;color:#0b1020;font:700 14px Geist,Inter,Arial,sans-serif;cursor:pointer}
    .quiet{height:40px;padding:0 4px;border:0;background:transparent;color:rgb(11 16 32 / .55);font:inherit;cursor:pointer}
    .password,.compose{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
    input{flex:1;min-width:140px;height:40px;border:1px solid rgb(11 16 32 / .16);border-radius:10px;padding:0 12px;color:#0b1020;font:inherit}
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
    : !channel ? `<p class="lead">Выберите, какой мессенджер обслуживает эту линию. На каждую линию приходится один мессенджер.</p><div class="choices">${messengerChannels.map(item => `<button class="tile" type="button" onclick="call('bind','${item}')"><span class="mark">${messengerTitles[item].slice(0, 1)}</span><span class="act">Подключить ${messengerTitles[item]}</span></button>`).join('')}</div>`
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
    : `<button class="go" type="button" onclick="call('start','${view.channel}')">Подключить</button>`
  const change = view.status === 'on' ? '' : `<button class="quiet" type="button" onclick="call('unbind','${view.channel}')">Другой мессенджер</button>`
  return `<section class="card" data-channel="${view.channel}" data-wait="${waiting ? '1' : '0'}"><div class="row"><div><h2>${escapeHtml(view.title)}</h2><p class="state">${escapeHtml(state)}. ${escapeHtml(hint)}</p></div><div class="actions">${button}${change}</div></div>${image}${password}${compose}</section>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}
