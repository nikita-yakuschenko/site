import test from 'node:test'
import assert from 'node:assert/strict'
import { leadInputSchema } from '../../src/lib/leads'

test('contact attribution survives validation for catalog string identifiers', () => {
  const input = { name: 'Тест', phone: '+79991234567', consent: true, siteId: 'corporate', pageId: 'barnhouse-115', projectExternalId: 'barnhouse-115', projectId: 8, formId: 'contacts-question', sourcePath: '/catalog/barnhouse-113', sourceUrl: 'http://localhost:3000/catalog/barnhouse-113', message: 'Вопрос', meta: { blockKey: 'contactsSection', projectSlug: 'barnhouse-113', projectName: 'Барнхаус 113' } }
  assert.deepEqual(leadInputSchema.parse(input), input)
})
test('invalid CMS project identifiers are rejected', () => {
  assert.equal(leadInputSchema.safeParse({ name: 'Тест', phone: '+79991234567', consent: true, siteId: 'corporate', projectId: 0 }).success, false)
})
