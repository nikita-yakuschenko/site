import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mediaDocumentId } from '../src/components/admin/media-id'

describe('mediaDocumentId', () => {
  it('accepts the numeric id Payload returns for a media row', () => {
    assert.equal(mediaDocumentId(12), '12')
    assert.equal(mediaDocumentId('12'), '12')
    assert.equal(mediaDocumentId({ id: 12 }), '12')
  })

  it('rejects product codes and empty values', () => {
    assert.equal(mediaDocumentId('AB12CDEF'), null)
    assert.equal(mediaDocumentId(0), null)
    assert.equal(mediaDocumentId(''), null)
    assert.equal(mediaDocumentId(null), null)
  })
})
