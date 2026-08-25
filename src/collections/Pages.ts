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
  admin: {
    useAsTitle: 'title',
    group: 'Content',
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
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
    },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'pageType',
      type: 'select',
      required: true,
      defaultValue: 'content',
      options: [
        { label: 'Content', value: 'content' },
        { label: 'Product', value: 'product' },
        { label: 'Application', value: 'application' },
      ],
    },
    {
      name: 'isHome',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'pages',
      admin: { condition: (_, sibling) => !sibling?.isHome },
    },
    {
      name: 'fullPath',
      type: 'text',
      index: true,
      admin: { readOnly: true, description: 'Unique within a site. Computed from parent + slug.' },
    },
    {
      name: 'layout',
      type: 'blocks',
      blocks: pageBlocks,
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'canonical', type: 'text' },
        {
          name: 'robots',
          type: 'select',
          defaultValue: 'index',
          options: [
            { label: 'Index', value: 'index' },
            { label: 'Noindex', value: 'noindex' },
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
            throw new Error(`Path already exists on this site: ${data.fullPath}`)
          }
        }
        return data
      },
    ],
    afterChange: [revalidatePage],
    afterDelete: [revalidatePageDelete],
  },
}
