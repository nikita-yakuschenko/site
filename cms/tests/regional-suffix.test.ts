import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_REGIONAL_SUFFIX, regionalSuffixFor, regionFromGeoResponse } from '../../src/lib/regional-suffix'

const geo = (region: string, country = 'RU') => ({ country: { iso: country }, region: { iso: region } })
test('only Russian Nizhny Novgorod oblast, Moscow and Moscow oblast enable the regional suffix', () => {
  assert.equal(regionFromGeoResponse(geo('RU-NIZ')), 'nn')
  assert.equal(regionFromGeoResponse(geo('RU-MOW')), 'msk')
  assert.equal(regionFromGeoResponse(geo('RU-MOS')), 'msk')
  for (const value of [null, {}, geo('RU-NGR'), geo('RU-SPE'), geo('RU-MOW','US'), { country: { iso: 'RU' }, city: { name_ru: 'Москва' } }, { ...geo('RU-MOW'), error: 'quota' }]) assert.equal(regionFromGeoResponse(value), null)
  assert.equal(regionalSuffixFor(null), '')
  assert.equal(regionalSuffixFor('nn'), DEFAULT_REGIONAL_SUFFIX.nn)
  assert.equal(regionalSuffixFor('msk'), DEFAULT_REGIONAL_SUFFIX.msk)
  assert.equal(regionalSuffixFor('nn', { nn: 'в Нижнем Новгороде\nи области', msk: '' }), DEFAULT_REGIONAL_SUFFIX.nn)
  assert.equal(regionalSuffixFor('msk', { nn: '', msk: '' }), '')
})
