import assert from 'node:assert/strict'
import test from 'node:test'
import { fallbackMessengerLinks, normalizeMessengerPhone, normalizeMessengerUrl, publicMessengers } from '../../src/lib/messengers'

test('ссылка мессенджера остаётся https без логина', () => {
  assert.equal(normalizeMessengerUrl('https://max.ru/avg_st'), 'https://max.ru/avg_st')
  assert.equal(normalizeMessengerUrl('http://max.ru/avg_st'), '')
  assert.equal(normalizeMessengerUrl('https://user:pass@max.ru/avg_st'), '')
})

test('номер мессенджера хранится цифрами', () => {
  assert.equal(normalizeMessengerPhone('+7 (831) 266-66-45'), '78312666645')
  assert.equal(normalizeMessengerPhone('123'), '')
})

test('выключенный мессенджер не отдаёт ссылку, пустое поле берёт запасную', () => {
  const off = publicMessengers({ maxEnabled: false, maxUrl: 'https://max.ru/other' })
  assert.equal(off.max.href, '')
  const empty = publicMessengers({})
  assert.equal(empty.telegram.href, 'https://t.me/avgstroy')
  assert.equal(empty.whatsapp.href, fallbackMessengerLinks().whatsapp)
})
