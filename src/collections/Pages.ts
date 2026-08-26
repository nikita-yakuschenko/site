import type { CollectionConfig } from 'payload'
import { pageRead, pageWrite } from '../access'
import { pageBlocks } from '../blocks'
import { revalidatePage, revalidatePageDelete } from '../hooks/revalidatePage'
import { generatePreviewUrl } from '../lib/preview'

function joinPath(parentPath: string | undefined, slug: string, isHome: boolean): string {
  if (isHome) return '/'
  const base = parentPath && parentPath !== '/' ? parentPath : ''
  return `${base}/${slug}`.replace(/\/+/g, '/')
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страницы' },
  admin: {
    useAsTitle: 'title',
    group: 'Управление контентом',
    defaultColumns: ['title', 'fullPath', 'site', '_status'],
    livePreview: {
      url: ({ data }) => generatePreviewUrl(String(data?.fullPath || '/')),
    },
    preview: (data) => generatePreviewUrl(String(data?.fullPath || '/')),
  },
  versions: {
    drafts: {
      autosave: true,
    },
    maxPerDoc: 50,
  },
  access: {
    read: pageRead,
    create: pageWrite,
    update: pageWrite,
    delete: pageWrite,
  },
  fields: [
    {
      name: 'site',
      label: 'Сайт',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
    },
    { name: 'title', label: 'Заголовок', type: 'text', required: true },
    { name: 'slug', label: 'Адрес в URL', type: 'text', required: true, index: true },
    {
      name: 'pageType',
      label: 'Тип страницы',
      type: 'select',
      required: true,
      defaultValue: 'content',
      options: [
        { label: 'Контент', value: 'content' },
        { label: 'Продукт', value: 'product' },
        { label: 'Заявка', value: 'application' },
      ],
    },
    {
      name: 'isHome',
      label: 'Главная страница',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'parent',
      label: 'Родительская страница',
      type: 'relationship',
      relationTo: 'pages',
      admin: { condition: (_, sibling) => !sibling?.isHome },
    },
    {
      name: 'fullPath',
      label: 'Полный путь',
      type: 'text',
      index: true,
      admin: { readOnly: true, description: 'Уникален в пределах сайта. Собирается из родителя и адреса в URL.' },
    },
    {
      name: 'layout',
      label: 'Блоки',
      type: 'blocks',
      blocks: pageBlocks,
    },
    {
      name: 'seo',
      label: 'Поисковая оптимизация',
      type: 'group',
      fields: [
        { name: 'title', label: 'Заголовок', type: 'text' },
        { name: 'description', label: 'Описание', type: 'textarea' },
        { name: 'image', label: 'Изображение', type: 'upload', relationTo: 'media' },
        { name: 'canonical', label: 'Канонический URL', type: 'text' },
        {
          name: 'robots',
          label: 'Индексация',
          type: 'select',
          defaultValue: 'index',
          options: [
            { label: 'Индексировать', value: 'index' },
            { label: 'Не индексировать', value: 'noindex' },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        if (!data) return data
        const siteId = data.site || originalDoc?.site
        const slug = String(data.slug || originalDoc?.slug || 'page')
        const isHome = Boolean(data.isHome ?? originalDoc?.isHome)
        let parentPath = ''
        const parentId = data.parent || originalDoc?.parent
        if (parentId && !isHome) {
          const parent = await req.payload.findByID({
            collection: 'pages',
            id: typeof parentId === 'object' ? parentId.id : parentId,
            depth: 0,
            draft: true,
            overrideAccess: true,
          })
          parentPath = String(parent.fullPath || '')
        }
        data.fullPath = joinPath(parentPath, slug, isHome)

        if (siteId) {
          const clash = await req.payload.find({
            collection: 'pages',
            where: {
              and: [
                { site: { equals: typeof siteId === 'object' ? siteId.id : siteId } },
                { fullPath: { equals: data.fullPath } },
                ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
              ],
            },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          if (clash.totalDocs > 0) {
            throw new Error(`Путь уже занят на этом сайте: ${data.fullPath}`)
          }
        }
        return data
      },
    ],
    afterChange: [revalidatePage],
    afterDelete: [revalidatePageDelete],
  },
}
