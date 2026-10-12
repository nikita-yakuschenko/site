import type { CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'

export function createMedia({ directory, uploadsEnabled }: { directory: string; uploadsEnabled: boolean }): CollectionConfig {
  return {
    slug: 'media',
    labels: { singular: 'Медиафайл', plural: 'Медиафайлы' },
    admin: { useAsTitle: 'title', components: { afterListTable: ['./components/admin/CollectionEmptyState#MediaEmptyState'] } },
    timestamps: true,
    access: {
      read: authenticated,
      create: uploadsEnabled ? contentWriter : () => false,
      update: uploadsEnabled ? contentWriter : () => false,
      delete: uploadsEnabled ? contentManager : () => false,
    },
    upload: {
      staticDir: directory,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
      imageSizes: [{ name: 'thumbnail', width: 320, height: 320, position: 'centre' }],
      adminThumbnail: 'thumbnail',
    },
    fields: [
      { name: 'alt', type: 'text', label: 'Альтернативный текст', required: true },
      { name: 'title', type: 'text', label: 'Название', required: true },
      { name: 'description', type: 'textarea', label: 'Описание' },
    ],
  }
}
