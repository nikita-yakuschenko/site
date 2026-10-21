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
  const body = webhookBody({ name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true, formId: 'mortgage-calculator', sourceUrl: 'https://avgst.ru/catalog/norway-115', meta: { formHeading: 'Расчёт ипотеки', monthlyPayment: 25000, utm_source: 'yandex', _ym_uid: '12345', yclid: '67890', roistatVisit: '204704' } }, 'test', 'Заявка')
  for (const line of ['Страница: https://avgst.ru/catalog/norway-115', 'formname: Расчёт ипотеки', 'monthlyPayment: 25000', 'utm_source: yandex', '_ym_uid: 12345', 'yclid: 67890']) assert.ok(body.comment.includes(line))
  assert.equal(body.yclid, '67890')
  assert.equal(body._ym_uid, '12345')
})
