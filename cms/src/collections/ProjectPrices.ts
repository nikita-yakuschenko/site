import type { CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'
import { configurationNames, isModularTechnology, priceConfigurationKeys } from '../../../src/lib/catalog/configuration-rules'
import { priceImportEndpoint } from './price-import-endpoint'
import { marketingPricePreviewEndpoint } from './marketing-price-endpoint'
import { priceKinds } from '../config/price-kinds'
import { nextPriceHistory } from '../config/price-history'

export const ProjectPrices: CollectionConfig = {
  slug: 'project-prices', labels: { singular: 'Цена проекта', plural: 'Прайс' },
  admin: { useAsTitle: 'lookupKey', defaultColumns: ['project', 'configuration', 'region', 'price', 'updatedAt'] },
  access: { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager },
  endpoints: [priceImportEndpoint, marketingPricePreviewEndpoint],
  hooks: { beforeValidate: [async ({ data, originalDoc, req }) => {
    if (!data) return data
    const row = { ...originalDoc, ...data }
    const projectID = typeof row.project === 'object' ? row.project.id : row.project
    // Internal check. Startup seeding has no signed-in user yet.
    const project = await req.payload.findByID({ collection: 'projects', id: projectID, depth: 0, req, overrideAccess: true })
    if (project.recordType === 'ready-home' || !priceConfigurationKeys(isModularTechnology(project.technologyBadge)).includes(row.configuration)) throw new Error('Комплектация не соответствует технологии проекта')
    data.lookupKey = `${projectID}:${row.configuration}:${row.region}`
    return data
  }], beforeChange: [({ data, originalDoc, operation, req }) => {
    if (operation === 'create' && req.context.projectDuplication === true) return data
    if (!data || typeof data.price !== 'number') return data
    const previous = operation === 'update' ? originalDoc : null
    data.history = nextPriceHistory(previous?.history, typeof previous?.price === 'number' ? previous.price : null, previous?.updatedAt ?? null, data.price)
    return data
  }] },
  fields: [
    { name: 'lookupKey', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'project', label: 'Проект', type: 'relationship', relationTo: 'projects', required: true },
    { name: 'configuration', label: 'Комплектация', type: 'select', required: true, options: Object.entries(configurationNames).map(([value, label]) => ({ value, label })) },
    { name: 'region', label: 'Тип цены', type: 'select', required: true, options: priceKinds.map(kind => ({ value: kind.value, label: kind.label })) },
    { name: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 1, validate: (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? true : 'Укажите положительную целую цену в рублях' },
    { name: 'history', label: 'История цены', type: 'json', admin: { hidden: true } },
  ],
}
