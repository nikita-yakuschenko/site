import test from 'node:test'
import assert from 'node:assert/strict'
import { attributionFromUrl, leadAttribution, LEAD_ATTRIBUTION_COOKIE } from '../../src/lib/lead-attribution'
import { webhookBody } from '../src/config/lead-adapters'

test('метки первого захода сохраняются после перехода в карточку; идентификаторы читаются из cookie', () => {
  const saved = attributionFromUrl('https://avgst.ru/?utm_source=yandex&utm_campaign=Дом&yclid=123')
  const cookie = `${LEAD_ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(saved))}; _ym_uid=1792491948336585363; roistat_visit=204704; secret=hidden`
  const meta = leadAttribution('https://avgst.ru/catalog/norway-115', cookie)
  assert.equal(meta.utm_source, 'yandex')
  assert.equal(meta.utm_campaign, 'Дом')
  assert.equal(meta.yclid, '123')
  assert.equal(meta._ym_uid, '1792491948336585363')
  assert.equal(meta.roistatVisit, '204704')
  assert.equal('secret' in meta, false)
})

test('новая рекламная кампания не смешивается с прежней; испорченные cookie безопасны', () => {
  const saved = encodeURIComponent(JSON.stringify({ utm_source: 'old', utm_content: 'old-ad' }))
  assert.equal(leadAttribution('https://avgst.ru/?utm_source=new', `${LEAD_ATTRIBUTION_COOKIE}=${saved}`).utm_content, undefined)
  assert.deepEqual(leadAttribution('invalid', `${LEAD_ATTRIBUTION_COOKIE}=%oops; _ym_uid=invalid`), {})
})

test('комментарий и плоские поля содержат атрибуцию и параметры выбранной формы', () => {
  const body = webhookBody({ name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true, formId: 'mortgage-calculator', sourceUrl: 'https://avgst.ru/catalog/norway-115', meta: { formHeading: 'Расчёт ипотеки', monthlyPayment: 25000, utm_source: 'yandex', _ym_uid: '12345', yclid: '67890', roistatVisit: '204704', utm_referrer: 'https://yandex.ru', gclid: 'google-click' } }, 'test', 'Заявка')
  for (const id of ['12345', '67890', '204704']) assert.equal(body.comment.includes(id), false)
  assert.ok(body.comment.includes('Обращение: Консультация по ипотеке'))
  assert.ok(body.comment.includes('Ежемесячный платёж:'))
  assert.equal(body.comment.includes('Страница:'), false)
  assert.equal(body.comment.includes('Согласие'), false)
  assert.equal(body.comment.includes('monthlyPayment'), false)
  assert.equal(body.comment.includes('utm_source:'), false)
  assert.equal(body.utm_source, 'yandex')
  assert.equal(body.yclid, '67890')
  assert.equal(body._ym_uid, '12345')
  assert.equal(body.utm_referrer, 'https://yandex.ru')
  assert.equal(body.comment.includes('https://yandex.ru'), false)
  assert.ok(body.comment.includes('Идентификатор клика Google Ads: google-click'))
})

 test('UTM скрыты также в адресах комментария, но исходный URL вебхука сохранён', () => {
  const sourceUrl = 'https://avgst.ru/catalog?utm_source=yandex&utm_campaign=test'
  const body = webhookBody({ name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true, sourceUrl, meta: { landing_page: sourceUrl, utm_source: 'yandex' } }, 'test', 'Заявка')
  assert.equal(body.comment.includes('utm_'), false)
  assert.equal(body.page, 'https://avgst.ru/catalog')
  assert.equal(body.lead.sourceUrl, sourceUrl)
  assert.equal(body.utm_source, 'yandex')
})

test('адрес страницы для CRM не содержит query и фрагмента, атрибуция сохранена', () => {
  const body = webhookBody({ name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true, sourceUrl: 'https://avgst.ru/catalog/norway-115?yclid=123&utm_source=yandex&foo=bar#form', meta: { utm_source: 'yandex', yclid: '123' } }, 'test', 'Заявка')
  assert.equal(body.page, 'https://avgst.ru/catalog/norway-115')
  assert.equal(body.utm_source, 'yandex')
  assert.equal(body.yclid, '123')
})
