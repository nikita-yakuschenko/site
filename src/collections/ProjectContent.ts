import type { CollectionConfig } from 'payload'
import { anyone, pageWrite } from '../access'

export const ProjectContent: CollectionConfig = {
  slug: 'project-content',
  admin: {
    useAsTitle: 'externalProjectId',
    group: 'Content',
    description: 'Editorial overlay for an operational project. Do not store prices here.',
  },
  access: {
    read: anyone,
    create: pageWrite,
    update: pageWrite,
    delete: pageWrite,
  },
  fields: [
    { name: 'externalProjectId', type: 'text', required: true, index: true },
    { name: 'site', type: 'relationship', relationTo: 'sites', required: true, index: true },
    { name: 'editorialTitle', type: 'text' },
    { name: 'editorialDescription', type: 'textarea' },
    {
      name: 'additionalMedia',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
  ],
}
