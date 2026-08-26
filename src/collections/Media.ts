import type { CollectionConfig } from 'payload'
import { anyone, authenticated, hqOnly } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Файлы' },
  admin: {
    group: 'Управление контентом',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: hqOnly,
  },
  fields: [
    {
      name: 'alt',
      label: 'Альтернативный текст',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  },
}
