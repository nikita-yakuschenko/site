import type { Access, CollectionConfig } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'

// Only images actually used by connected public blocks are readable anonymously.
const readMedia: Access = async ({ req }) => {
  if (await authenticated({ req })) return true
  const projects = await req.payload.find({
    collection: 'projects', overrideAccess: true, depth: 0, pagination: false,
    where: { or: [{ heroContentSource: { equals: 'database' } }, { exteriorsContentSource: { equals: 'database' } }, { interiorsContentSource: { equals: 'database' } }, { builtContentSource: { equals: 'database' } }, { plansContentSource: { equals: 'database' } }] },
    select: { heroContentSource: true, exteriorsContentSource: true, interiorsContentSource: true, builtContentSource: true, plansContentSource: true, plans: true, desktopImage: true, mobileImage: true, exteriors: true, interiors: true, built: true },
  })
  const ids = projects.docs.flatMap(project => [
    ...(project.heroContentSource === 'database' ? [project.desktopImage, project.mobileImage] : []),
    ...(project.exteriorsContentSource === 'database' ? (project.exteriors || []).map(row => row.photo) : []),
    ...(project.interiorsContentSource === 'database' ? (project.interiors || []).map(row => row.photo) : []),
    ...(project.plansContentSource === 'database' ? (project.plans || []).flatMap(variant => (variant.floors || []).map(floor => floor.photo)) : []),
    ...(project.builtContentSource === 'database' ? (project.built || []).map(row => row.photo) : []),
  ])
    .filter((id): id is number => typeof id === 'number')
  return ids.length ? { id: { in: ids } } : false
}

export function createMedia({ directory, uploadsEnabled }: { directory: string; uploadsEnabled: boolean }): CollectionConfig {
  return {
    slug: 'media',
    labels: { singular: 'Медиафайл', plural: 'Медиафайлы' },
    admin: { useAsTitle: 'title', components: { afterListTable: ['./components/admin/CollectionEmptyState#MediaEmptyState'] } },
    timestamps: true,
    access: {
      read: readMedia,
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
