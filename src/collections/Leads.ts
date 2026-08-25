import type { CollectionConfig } from 'payload'
import { hqOnly, leadRead } from '../access'

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    group: 'Operations',
    defaultColumns: ['name', 'phone', 'site', 'createdAt'],
  },
  access: {
    create: hqOnly,
    read: leadRead,
    update: hqOnly,
    delete: hqOnly,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'phone', type: 'text', required: true },
    { name: 'site', type: 'relationship', relationTo: 'sites', required: true },
    { name: 'page', type: 'relationship', relationTo: 'pages' },
    { name: 'projectExternalId', type: 'text' },
    { name: 'sourcePath', type: 'text' },
    { name: 'utm', type: 'json' },
  ],
}
