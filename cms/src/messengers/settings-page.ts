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
    h2{display:flex;align-items:center;gap:10px;margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em}
    h2 .logo,h2 .logo svg{width:32px;height:32px}
    .lead{margin:0 0 14px;color:rgb(11 16 32 / .62)}
    .choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:100%;min-height:112px;padding:16px 8px;border:1px solid rgb(11 16 32 / .1);border-radius:16px;background:#fff;color:#0b1020;cursor:pointer;font:inherit}
    .tile:hover{border-color:#fcc90c;background:#fffdf6;box-shadow:0 0 0 3px rgb(252 201 12 / .35)}
    .logo{display:block;width:44px;height:44px;flex:none}
    .logo svg{display:block;width:44px;height:44px}
    .act{font-size:14px;font-weight:600;letter-spacing:-.01em}
    @media (max-width:460px){.choices{grid-template-columns:1fr}.tile{flex-direction:row;justify-content:flex-start;min-height:0;padding:12px 14px}}
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
  const title = 'Подключение мессенджера к открытой линии'
  const body = !line ? '<p class="lead">Сначала откройте этот канал из настроек открытой линии.</p>'
    : !channel ? `<p class="lead">Выберите, какой мессенджер будет подключен к этой открытой линии.</p><div class="choices">${messengerChannels.map(item => `<button class="tile" type="button" onclick="call('bind','${item}')">${logo(item)}<span class="act">${messengerTitles[item]}</span></button>`).join('')}</div>`
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
  return `<section class="card" data-channel="${view.channel}" data-wait="${waiting ? '1' : '0'}"><div class="row"><div><h2>${logo(view.channel)}<span>${escapeHtml(view.title)}</span></h2><p class="state">${escapeHtml(state)}. ${escapeHtml(hint)}</p></div><div class="actions">${button}${change}</div></div>${image}${password}${compose}</section>`
}

function logo(channel: MessengerChannel) {
  const mark = channel === 'whatsapp'
    ? '<circle cx="20" cy="20" r="20" fill="#25D366"/><path fill="#fff" d="M20.2 9.6a8.8 8.8 0 0 0-7.6 13.2l-1.1 4 4.1-1.1a8.8 8.8 0 1 0 4.6-16.1zm5 12.4c-.2.6-1.2 1.1-1.6 1.1-.4 0-.9.2-2.9-.6-2.4-1-4-3.4-4.1-3.5-.1-.2-1.1-1.5-1.1-2.9s.7-2 .9-2.3.4-.4.6-.4h.5c.2 0 .4 0 .5.4.2.6.8 1.9.8 2 0 .2 0 .3-.1.5l-.3.4c-.1.2-.3.3-.1.6.1.3.7 1.2 1.6 2 1.1.9 2 1.2 2.3 1.4.2.1.4.1.5-.1l.5-.6c.1-.2.3-.1.5-.1l1.8.8c.2.1.3.2.4.3.1.2 0 .7-.2 1.1z"/>'
    : channel === 'telegram'
      ? '<circle cx="20" cy="20" r="20" fill="#2AABEE"/><path fill="#fff" d="M29 12.2 10.7 19.2c-1.2.5-1.2 1.1-.2 1.4l4.6 1.4 10.7-6.8c.5-.3 1-.1.6.2L17.6 23.4l-.3 4.7c.5 0 .7-.2 1-.5l2.4-2.3 4.8 3.6c.9.5 1.5.2 1.8-.8l3.2-15c.3-1.3-.5-1.9-1.5-1.4z"/>'
      : '<rect width="40" height="40" rx="12" fill="#111318"/><path fill="#fff" d="M11.5 13.2h17a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H18.2l-4.4 3.4v-3.4h-2.3a2 2 0 0 1-2-2v-7.6a2 2 0 0 1 2-2z"/>'
  return `<span class="logo" aria-hidden="true"><svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">${mark}</svg></span>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}
