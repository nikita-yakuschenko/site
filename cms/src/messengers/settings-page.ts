import { messengerChannels, messengerTitles, readablePhone, type AccountView } from './phone'

const scanHint: Record<AccountView['channel'], string> = {
  whatsapp: 'В WhatsApp: Связанные устройства → Привязка устройства.',
  telegram: 'В Telegram: Настройки → Устройства → Подключить устройство.',
  max: 'В MAX: Профиль → Устройства → Войти по QR-коду.',
}

export function settingsMarkup(line: number, views: AccountView[], auth: Record<string, string>) {
  const cards = views.map(view => card(view)).join('')
  const lineText = line ? `Канал подключён к линии ${line}.` : 'Откройте канал в контакт-центре, чтобы ответы попадали в открытую линию.'
  const authJson = JSON.stringify(auth).replace(/</g, '\\u003c')
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Рабочие номера</title><style>
    body{margin:0;font:15px/1.4 system-ui,sans-serif;color:#1a1a1a;background:#fff}
    .wrap{padding:16px 16px 20px}
    h1{margin:0 0 6px;font-size:20px}
    .lead{margin:0 0 14px;color:#4d5660}
    .card{border:1px solid #e3e7ee;border-radius:12px;padding:12px;margin:0 0 10px}
    .row{display:flex;justify-content:space-between;gap:12px;align-items:center}
    h2{margin:0;font-size:16px}
    .state{margin:4px 0 0;color:#4d5660}
    button{height:36px;padding:0 12px;border:0;border-radius:8px;background:#fcc90c;font:600 14px system-ui;cursor:pointer}
    button.quiet{background:#eef1f5}
    img{display:block;width:196px;height:196px;margin:10px 0}
    .password{display:flex;gap:8px;margin-top:8px}
    input{flex:1;height:36px;border:1px solid #d5dbe3;border-radius:8px;padding:0 10px;font:inherit}
  </style></head><body><div class="wrap"><h1>Рабочие номера</h1><p class="lead">${escapeHtml(lineText)} Отсканируйте код в приложении на рабочем телефоне. После этого ответ оператора уйдёт клиенту с этого номера.</p>${cards}</div>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <script>
    const auth = ${authJson}
    function fit(){ if (window.BX24 && BX24.fitWindow) BX24.fitWindow() }
    if (window.BX24 && BX24.init) BX24.init(fit)
    window.addEventListener('load', function(){ setTimeout(fit, 50); setTimeout(fit, 400) })
    async function call(channel, action, password){
      const body = new URLSearchParams(auth)
      body.set('channel', channel)
      body.set('action', action)
      if (password) body.set('password', password)
      const response = await fetch('/bitrix/messengers/connect', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      const data = await response.json()
      const card = document.querySelector('[data-channel="' + channel + '"]')
      if (card && data.markup) card.outerHTML = data.markup
      fit()
    }
    setInterval(function(){ document.querySelectorAll('[data-wait="1"]').forEach(function(card){ call(card.getAttribute('data-channel'), 'status') }) }, 3000)
  </script></body></html>`
}

export function cardMarkup(view: AccountView) {
  return card(view)
}

function card(view: AccountView) {
  const waiting = view.status === 'qr' || view.status === 'password'
  const phone = readablePhone(view.phone)
  const state = view.status === 'on' ? `Подключён${phone ? `, ${phone}` : ''}` : view.status === 'qr' ? 'Ждём скан' : view.status === 'password' ? 'Нужен пароль' : view.status === 'error' ? 'Не подключился' : 'Не подключён'
  const hint = view.hint || (view.status === 'on' ? 'Ответ оператора в открытой линии уйдёт клиенту с этого номера.' : scanHint[view.channel])
  const image = view.qr ? `<img alt="Код для входа" src="${escapeHtml(view.qr)}">` : ''
  const password = view.status === 'password' ? `<div class="password"><input name="password" type="password" autocomplete="current-password" placeholder="Пароль"><button type="button" onclick="call('${view.channel}','password',this.previousElementSibling.value)">Продолжить</button></div>` : ''
  const button = view.status === 'on'
    ? `<button class="quiet" type="button" onclick="call('${view.channel}','logout')">Отключить</button>`
    : `<button type="button" onclick="call('${view.channel}','start')">Подключить</button>`
  return `<section class="card" data-channel="${view.channel}" data-wait="${waiting ? '1' : '0'}"><div class="row"><div><h2>${escapeHtml(view.title)}</h2><p class="state">${escapeHtml(state)}. ${escapeHtml(hint)}</p></div>${button}</div>${image}${password}</section>`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
}

export function emptyViews(): AccountView[] {
  return messengerChannels.map(channel => ({ channel, title: messengerTitles[channel], status: 'off', phone: '', qr: '', hint: '' }))
}
