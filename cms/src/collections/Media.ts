import type { Access, CollectionConfig, PayloadRequest } from 'payload'
import { authenticated, contentManager, contentWriter } from '../access/staff'

// Имя файла без расширения. Пустые название и alt не должны блокировать сохранение.
function labelFromFilename(filename?: string | null) {
  const base = filename?.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '').trim()
  return base || 'Изображение'
}

// Каждая анонимная картинка иначе перечитывает все проекты и исчерпывает пул подключений.
const PUBLIC_MEDIA_TTL_MS = 10_000
let publicMediaCache: { expires: number; ids: Promise<string[]> } | null = null

function publicMediaIds(req: PayloadRequest): Promise<string[]> {
  const now = Date.now()
  if (!publicMediaCache || publicMediaCache.expires < now) {
    const ids = loadPublicMediaIds(req)
    publicMediaCache = { expires: now + PUBLIC_MEDIA_TTL_MS, ids }
    ids.catch(() => { publicMediaCache = null })
  }
  return publicMediaCache.ids
}

export function clearPublicMediaCache() {
  publicMediaCache = null
}

// Only images actually used by connected public blocks are readable anonymously.
const readMedia: Access = async ({ req }) => {
  if (await authenticated({ req })) return true
  const ids = await publicMediaIds(req)
  return ids.length ? { id: { in: ids } } : false
}

async function loadPublicMediaIds(req: PayloadRequest): Promise<string[]> {
  const projects = await req.payload.find({
    collection: 'projects', overrideAccess: true, depth: 0, pagination: false,
    where: { or: [{ heroContentSource: { equals: 'database' } }, { exteriorsContentSource: { equals: 'database' } }, { interiorsContentSource: { equals: 'database' } }, { builtContentSource: { equals: 'database' } }, { plansContentSource: { equals: 'database' } }] },
    select: { heroContentSource: true, exteriorsContentSource: true, interiorsContentSource: true, builtContentSource: true, plansContentSource: true, plans: true, desktopImage: true, mobileImage: true, exteriors: true, interiors: true, built: true },
  })
  return projects.docs.flatMap(project => [
    ...(project.heroContentSource === 'database' ? [project.desktopImage, project.mobileImage] : []),
    ...(project.exteriorsContentSource === 'database' ? (project.exteriors || []).map(row => row.photo) : []),
    ...(project.interiorsContentSource === 'database' ? (project.interiors || []).map(row => row.photo) : []),
    ...(project.plansContentSource === 'database' ? (project.plans || []).flatMap(variant => (variant.floors || []).map(floor => floor.photo)) : []),
    ...(project.builtContentSource === 'database' ? (project.built || []).map(row => row.photo) : []),
  ])
    .filter((id): id is string => typeof id === 'string')
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
      formatOptions: { format: 'webp', options: { quality: 80 } },
      imageSizes: [{ name: 'thumbnail', width: 320, height: 320, position: 'centre', formatOptions: { format: 'webp', options: { quality: 80 } } }],
      adminThumbnail: 'thumbnail',
    },
    hooks: {
      beforeValidate: [({ data, req }) => {
        if (!data) return data
        const label = labelFromFilename(typeof data.filename === 'string' ? data.filename : req.file?.name)
        if (!data.title?.trim()) data.title = label
        if (!data.alt?.trim()) data.alt = data.title
        return data
      }],
    },
    fields: [
      { name: 'alt', type: 'text', label: 'Альтернативный текст', admin: { description: 'Если пусто, подставится имя файла.' } },
      { name: 'title', type: 'text', label: 'Название', admin: { description: 'Если пусто, подставится имя файла.' } },
      { name: 'description', type: 'textarea', label: 'Описание' },
    ],
  }
}
