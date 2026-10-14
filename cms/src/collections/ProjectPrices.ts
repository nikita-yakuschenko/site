import type { CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'
import { configurationKeys, configurationNames, isModularTechnology } from '../../../src/lib/catalog/configuration-rules'
import { priceImportEndpoint } from './price-import-endpoint'
import { priceKinds } from '../config/price-kinds'

export const ProjectPrices: CollectionConfig = {
  slug: 'project-prices', labels: { singular: 'Цена проекта', plural: 'Прайс' },
  admin: { useAsTitle: 'lookupKey', defaultColumns: ['project', 'configuration', 'region', 'price', 'updatedAt'] },
  access: { read: authenticated, create: contentWriter, update: contentWriter, delete: contentManager },
  endpoints: [priceImportEndpoint],
  hooks: { beforeValidate: [async ({ data, originalDoc, req }) => {
    if (!data) return data
    const row = { ...originalDoc, ...data }
    const projectID = typeof row.project === 'object' ? row.project.id : row.project
    // Internal check. Startup seeding has no signed-in user yet.
    const project = await req.payload.findByID({ collection: 'projects', id: projectID, depth: 0, req, overrideAccess: true })
    if (project.recordType === 'ready-home' || !configurationKeys(isModularTechnology(project.technologyBadge)).includes(row.configuration)) throw new Error('Комплектация не соответствует технологии проекта')
    data.lookupKey = `${projectID}:${row.configuration}:${row.region}`
    return data
  }] },
  fields: [
    { name: 'lookupKey', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'project', label: 'Проект', type: 'relationship', relationTo: 'projects', required: true },
    { name: 'configuration', label: 'Комплектация', type: 'select', required: true, options: Object.entries(configurationNames).map(([value, label]) => ({ value, label })) },
    { name: 'region', label: 'Тип цены', type: 'select', required: true, options: priceKinds.map(kind => ({ value: kind.value, label: kind.label })) },
    { name: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 1, validate: (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? true : 'Укажите положительную целую цену в рублях' },
  ],
}
