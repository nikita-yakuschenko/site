import type { CollectionConfig } from 'payload'
import { anyone, pageWrite } from '../access'

export const ProjectContent: CollectionConfig = {
  slug: 'project-content',
  labels: { singular: 'Контент проекта', plural: 'Контент проектов' },
  admin: {
    useAsTitle: 'externalProjectId',
    group: 'Контент',
    description: 'Редакторская обложка операционного проекта. Цены здесь не хранятся.',
  },
  access: {
    read: anyone,
    create: pageWrite,
    update: pageWrite,
    delete: pageWrite,
  },
  fields: [
    { name: 'externalProjectId', label: 'ID проекта', type: 'text', required: true, index: true },
    { name: 'site', label: 'Сайт', type: 'relationship', relationTo: 'sites', required: true, index: true },
    { name: 'editorialTitle', label: 'Редакторский заголовок', type: 'text' },
    { name: 'editorialDescription', label: 'Редакторское описание', type: 'textarea' },
    {
      name: 'additionalMedia',
      label: 'Дополнительные фото',
      labels: { singular: 'Фото', plural: 'Фото' },
      type: 'array',
      fields: [{ name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media', required: true }],
    },
  ],
}
