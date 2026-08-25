import type { CollectionConfig } from 'payload'
import { hqOnly, leadRead } from '../access'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  admin: {
    useAsTitle: 'name',
    group: 'Операции',
    defaultColumns: ['name', 'phone', 'site', 'createdAt'],
  },
  access: {
    create: hqOnly,
    read: leadRead,
    update: hqOnly,
    delete: hqOnly,
  },
  fields: [
    { name: 'name', label: 'Имя', type: 'text', required: true },
    { name: 'phone', label: 'Телефон', type: 'text', required: true },
    { name: 'site', label: 'Сайт', type: 'relationship', relationTo: 'sites', required: true },
    { name: 'page', label: 'Страница', type: 'relationship', relationTo: 'pages' },
    { name: 'projectExternalId', label: 'ID проекта', type: 'text' },
    { name: 'sourcePath', label: 'Страница источника', type: 'text' },
    { name: 'utm', label: 'UTM-метки', type: 'json' },
  ],
  timestamps: true,
}
