import test from 'node:test'
import assert from 'node:assert/strict'
import { detectLeadType, resolveLeadClassification } from '../src/config/lead-classification'

test('явные тестовые пометки и фиктивные контакты распознаются независимо от регистра', () => {
  for (const payload of [
    { name: 'ТЕСТ НЕ ОБРАБАТЫВАТЬ НЕ ЗВОНИТЬ' },
    { name: 'тест' },
    { name: 'QA registration' },
    { name: 'Test registration' },
    { name: 'Александр', phone: '+79000000000' },
    { name: 'Александр', meta: { email: 'qa@example.com' } },
  ]) assert.equal(detectLeadType(payload).leadType, 'test')
})
test('спам определяется по явным признакам, обычные вопросы не отбрасываются', () => {
  assert.equal(detectLeadType({ message: 'https://a.ru https://b.ru https://c.ru' }).leadType, 'spam')
  assert.equal(detectLeadType({ message: 'Предлагаем продвижение вашего сайта' }).leadType, 'spam')
  for (const payload of [
    { name: 'Александр Тестов', phone: '+79049220541' },
    { name: 'Иван', message: 'Не звонить, напишите на почту. Интересует дом https://avgst.ru/catalog/barnhouse-71' },
    { name: 'Мария', message: 'Хочу посмотреть дом' },
    { name: 'Мария', message: 'Сравните https://avgst.ru/catalog/a https://avgst.ru/catalog/b https://msk.avgst.ru/catalog/c' },
  ]) assert.equal(detectLeadType(payload).leadType, 'work')
})
test('ручной тип переживает изменение статуса доставки и сбрасывается только явно', () => {
  const original = { leadType: 'work', typeSource: 'manual', payload: { name: 'ТЕСТ' } }
  assert.deepEqual(resolveLeadClassification({ status: 'sent' }, original), { leadType: 'work', typeSource: 'manual', typeReason: 'Тип выбран сотрудником вручную.' })
  assert.equal(resolveLeadClassification({ typeSource: 'auto' }, original).leadType, 'test')
  assert.equal(resolveLeadClassification({ payload: { name: 'ТЕСТ' } }).leadType, 'test')
})
