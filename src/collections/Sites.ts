import type { CollectionConfig } from 'payload'
import { fieldHqOnly, siteRead, siteWrite } from '../access'
import { assertUniqueHostnames, normalizeHost, type SiteHostRecord } from '../lib/host'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: {
    useAsTitle: 'name',
    group: 'Platform',
    defaultColumns: ['name', 'code', 'type', 'status'],
  },
  access: {
    read: siteRead,
    create: siteWrite,
    update: siteWrite,
    delete: siteWrite,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { update: fieldHqOnly },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'corporate',
      options: [
        { label: 'Corporate', value: 'corporate' },
        { label: 'Partner', value: 'partner' },
        { label: 'Regional', value: 'regional' },
        { label: 'Campaign', value: 'campaign' },
      ],
      access: { update: fieldHqOnly },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      access: { update: fieldHqOnly },
    },
    { name: 'subdomain', type: 'text', access: { update: fieldHqOnly } },
    {
      name: 'customDomains',
      type: 'array',
      access: { update: fieldHqOnly },
      fields: [{ name: 'hostname', type: 'text', required: true }],
    },
    {
      name: 'partnerExternalId',
      type: 'text',
      admin: { description: 'Operational partner id. Required for partner sites.' },
      access: { update: fieldHqOnly },
    },
    {
      name: 'brand',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'media' },
        { name: 'mobileLogo', type: 'upload', relationTo: 'media' },
        { name: 'favicon', type: 'upload', relationTo: 'media' },
        {
          name: 'permittedTheme',
          type: 'select',
          defaultValue: 'brand',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'Brand', value: 'brand' },
          ],
        },
      ],
    },
    {
      name: 'contacts',
      type: 'group',
      fields: [
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
    {
      name: 'navigation',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      fields: [{ name: 'legal', type: 'textarea' }],
    },
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        const next = data || {}
        const hosts = (next.customDomains || []).map((row: { hostname?: string }) => ({
          hostname: normalizeHost(row.hostname || ''),
        }))
        if (next.customDomains) next.customDomains = hosts.filter((row: { hostname: string }) => row.hostname)

        const others = await req.payload.find({
          collection: 'sites',
          limit: 500,
          depth: 0,
          overrideAccess: true,
        })
        const records: SiteHostRecord[] = others.docs.map((doc) => ({
          code: String(doc.code),
          status: String(doc.status),
          subdomain: doc.subdomain ? String(doc.subdomain) : null,
          customDomains: (doc.customDomains || []) as Array<{ hostname?: string }>,
        }))
        const duplicates = assertUniqueHostnames(records, originalDoc?.code || next.code)
        const incoming = hosts.map((row: { hostname: string }) => row.hostname)
        const clash = incoming.filter((host: string) => duplicates.includes(host))
        if (clash.length) {
          throw new Error(`Domain already used: ${clash.join(', ')}`)
        }
        return next
      },
    ],
  },
}
