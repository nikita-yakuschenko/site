import assert from 'node:assert/strict'
import test from 'node:test'
import { nextPriceHistory, readPriceHistory } from '../src/config/price-history'

test('a new price starts a date-amount history', () => {
  const history = nextPriceHistory(undefined, null, null, 5_750_000)
  assert.equal(history.length, 1)
  assert.equal(history[0]?.amount, 5_750_000)
  assert.match(history[0]?.date || '', /^\d{4}-\d{2}-\d{2}$/)
})

test('an unchanged price does not add a history row', () => {
  assert.deepEqual(nextPriceHistory(undefined, 1000, '2026-10-01T00:00:00.000Z', 1000), [])
  const kept = [{ date: '2026-10-01', amount: 1000 }]
  assert.deepEqual(nextPriceHistory(kept, 1000, '2026-10-01T00:00:00.000Z', 1000), kept)
})

test('a changed price keeps the previous amount and appends the new one', () => {
  const history = nextPriceHistory(undefined, 1000, '2026-10-01T00:00:00.000Z', 1200)
  assert.equal(history[0]?.amount, 1000)
  assert.equal(history[0]?.date, '2026-10-01')
  assert.equal(history[1]?.amount, 1200)
  assert.equal(readPriceHistory([{ date: 'bad', amount: 1 }, { date: '2026-10-02', amount: 2 }]).length, 1)
})
