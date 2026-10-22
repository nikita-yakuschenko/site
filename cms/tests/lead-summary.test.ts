import test from 'node:test'
import assert from 'node:assert/strict'
import { webhookBody } from '../src/config/lead-adapters'
import { leadTitle } from '../src/config/lead-title'
import type { LeadInput } from '../../src/lib/leads'

test('комментарий содержит русские сведения без дублирования отдельных полей CRM', () => {
  const lead: LeadInput = {
    name: 'Образец', phone: '+79990000000', siteId: 'corporate', consent: true,
    formId: 'mortgage-calculator', sourceUrl: 'https://avgst.ru/catalog/barnhouse-138',
    meta: {
      formHeading: 'Получить консультацию', region: 'nn', projectSlug: 'barnhouse-138',
      projectName: 'Барнхаус 138', project: 'Барнхаус 138', tier: 'Стандартная',
      calc_mode: 'payment', program: 'family', property_price: 5543000,
      down_payment: 1108600, term_years: 30, monthly_payment: 26586, loan_amount: 4434400,
      is_combined: false, construction_region: 'Нижегородская область', children_count: 1,
      subsidy_months: 180, remaining_after_subsidy: 3150589.9583533388,
      parts: [{ kind: 'subsidized', principal: 4434400, rate: 0.06 }],
      landing_page: 'https://avgst.ru/catalog', yclid: '1926450459123908607', roistatVisit: '123456',
    },
  }
  const body = webhookBody(lead, 'sample', leadTitle(lead))
  assert.equal(body.title, 'Консультация по ипотеке - Барнхаус 138 - Семейная ипотека')
  assert.deepEqual(body.comment.split('\n\n')[0].split('\n'), [
    'Обращение: Консультация по ипотеке', 'Проект: Барнхаус 138', 'Комплектация: Стандартная',
    'Регион строительства: Нижегородская область', 'Программа: Семейная ипотека',
    'Режим расчёта: По ежемесячному платежу',
    `Стоимость дома: ${(5543000).toLocaleString('ru-RU')} ₽`,
    `Первоначальный взнос: ${(1108600).toLocaleString('ru-RU')} ₽`,
    `Сумма кредита: ${(4434400).toLocaleString('ru-RU')} ₽`, 'Срок кредита: 30 лет',
    `Ежемесячный платёж: ${(26586).toLocaleString('ru-RU')} ₽`, 'Количество детей: 1',
    'Комбинированная ипотека: Нет', 'Срок льготного периода: 180 мес.', 'Ставка льготной части: 6%',
  ])
  assert.equal(body.comment.split('\n\n')[1], 'Страница первого захода: https://avgst.ru/catalog')
  for (const id of ['123456', '1926450459123908607']) assert.equal(body.comment.includes(id), false)
  for (const text of [body.comment]) {
    assert.doesNotMatch(text, /Согласие|Страница отправки|remaining_after_subsidy|Остаток|projectSlug|\{"kind"/)
    assert.equal(text.includes(lead.sourceUrl!), false)
  }
  assert.equal(body.page, lead.sourceUrl)
  assert.equal(body.lead.consent, true)
  assert.equal(body.roistat, '123456')
})
