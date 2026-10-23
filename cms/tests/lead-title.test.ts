import test from 'node:test'
import assert from 'node:assert/strict'
import { leadTitle } from '../src/config/lead-title'

const base = { name: 'Тест', phone: '+79990000000', siteId: 'corporate', consent: true as const }
const title = (formId: string, meta: Record<string, unknown> = {}, extra: Record<string, unknown> = {}, formTitle = '') => leadTitle({ ...base, formId, meta, ...extra }, formTitle)

test('известные формы получают свои названия', () => {
  assert.equal(title('project-configuration', { project: 'Норвегия 132', tier: 'Стандарт' }), 'Новая заявка с сайта: Расчёт стоимости - Норвегия 132 - Стандарт')
  assert.equal(title('ready-home-offer', { project: 'Норвегия 115', location: 'Гремячки' }), 'Новая заявка с сайта: Готовый дом - Норвегия 115 - Гремячки')
  assert.equal(title('architect-consultation', { projectName: 'Барнхаус 96' }), 'Новая заявка с сайта: Консультация архитектора - Барнхаус 96')
  assert.equal(title('mortgage-calculator', { projectName: 'Сканди 106', program: 'family' }), 'Консультация по ипотеке - Сканди 106 - Семейная ипотека')
  assert.equal(title('mortgage-calculator', { program: 'it' }), 'Консультация по ипотеке - IT-ипотека')
  assert.equal(title('mortgage-consultation', { program: 'rural' }), 'Консультация по ипотеке - Сельская ипотека')
  assert.equal(title('factory-tour'), 'Новая заявка с сайта: Экскурсия на производство')
  assert.equal(title('FactoryOpenDayForm', { date: '14 ноября' }), 'Новая заявка с сайта: Регистрация на день открытых дверей 14 ноября')
  assert.equal(title('referral-program'), 'Новая заявка с сайта: Регистрация в реферальной программе')
})

test('вопрос называет страницу', () => {
  assert.equal(title('contacts-question', { projectName: 'Норвегия 132' }), 'Новая заявка с сайта: Задать вопрос на странице Норвегия 132')
  assert.equal(title('header-question', {}, { sourcePath: '/' }), 'Новая заявка с сайта: Задать вопрос на странице Главная')
  assert.equal(title('header-question', { pageTitle: 'Семейная ипотека | Авангард Строй' }, { sourcePath: '/mortgage/family-mortgage' }), 'Новая заявка с сайта: Задать вопрос на странице Семейная ипотека')
})

test('прочие формы называются заголовком формы, без длинных тире', () => {
  assert.equal(title('consultation-dialog', { formHeading: 'Экскурсия в КП Гремячки' }), 'Новая заявка с сайта: Экскурсия в КП Гремячки')
  assert.equal(title('promo-form', {}, {}, 'Запись на просмотр'), 'Новая заявка с сайта: Запись на просмотр')
  assert.ok(!title('project-configuration', { project: 'А', tier: 'Б' }).includes('—'))
})
