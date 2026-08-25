import type { CollectionConfig } from 'payload'
import { fieldHqOnly, siteRead, siteWrite } from '../access'
import { assertUniqueHostnames, normalizeHost, type SiteHostRecord } from '../lib/host'

export const Sites: CollectionConfig = {
  slug: 'sites',
  labels: { singular: 'Сайт', plural: 'Сайты' },
  admin: {
    useAsTitle: 'name',
    group: 'Платформа',
    defaultColumns: ['name', 'code', 'type', 'status'],
  },
  access: {
    read: siteRead,
    create: siteWrite,
    update: siteWrite,
    delete: siteWrite,
  },
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true },
    {
      name: 'code',
      label: 'Код',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { update: fieldHqOnly },
    },
    {
      name: 'type',
      label: 'Тип',
      type: 'select',
      required: true,
      defaultValue: 'corporate',
      options: [
        { label: 'Корпоративный', value: 'corporate' },
        { label: 'Партнёрский', value: 'partner' },
        { label: 'Региональный', value: 'regional' },
        { label: 'Кампания', value: 'campaign' },
      ],
      access: { update: fieldHqOnly },
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликован', value: 'published' },
        { label: 'В архиве', value: 'archived' },
      ],
      access: { update: fieldHqOnly },
    },
    { name: 'subdomain', label: 'Поддомен', type: 'text', access: { update: fieldHqOnly } },
    {
      name: 'customDomains',
      label: 'Свои домены',
      labels: { singular: 'Домен', plural: 'Домены' },
      type: 'array',
      access: { update: fieldHqOnly },
      fields: [{ name: 'hostname', label: 'Хост', type: 'text', required: true }],
    },
    {
      name: 'partnerExternalId',
      label: 'ID партнёра',
      type: 'text',
      admin: { description: 'Идентификатор партнёра в операционной системе. Обязателен для партнёрских сайтов.' },
      access: { update: fieldHqOnly },
    },
    {
      name: 'brand',
      label: 'Бренд',
      type: 'group',
      fields: [
        { name: 'logo', label: 'Логотип', type: 'upload', relationTo: 'media' },
        { name: 'mobileLogo', label: 'Мобильный логотип', type: 'upload', relationTo: 'media' },
        { name: 'favicon', label: 'Фавикон', type: 'upload', relationTo: 'media' },
        {
          name: 'permittedTheme',
          label: 'Тема',
          type: 'select',
          defaultValue: 'brand',
          options: [
            { label: 'Светлая', value: 'light' },
            { label: 'Тёмная', value: 'dark' },
            { label: 'Брендовая', value: 'brand' },
          ],
        },
      ],
    },
    {
      name: 'contacts',
      label: 'Контакты',
      type: 'group',
      fields: [
        { name: 'phone', label: 'Телефон', type: 'text' },
        { name: 'email', label: 'Почта', type: 'email' },
        { name: 'address', label: 'Адрес', type: 'textarea' },
      ],
    },
    {
      name: 'socialLinks',
      label: 'Соцсети',
      labels: { singular: 'Ссылка', plural: 'Ссылки' },
      type: 'array',
      fields: [
        { name: 'label', label: 'Подпись', type: 'text', required: true },
        { name: 'href', label: 'Адрес', type: 'text', required: true },
      ],
    },
    {
      name: 'navigation',
      label: 'Навигация',
      labels: { singular: 'Пункт', plural: 'Пункты' },
      type: 'array',
      fields: [
        { name: 'label', label: 'Подпись', type: 'text', required: true },
        { name: 'href', label: 'Адрес', type: 'text', required: true },
      ],
    },
    {
      name: 'footer',
      label: 'Подвал',
      type: 'group',
      fields: [{ name: 'legal', label: 'Правовая информация', type: 'textarea' }],
    },
    {
      name: 'defaultSeo',
      label: 'Поисковая оптимизация по умолчанию',
      type: 'group',
      fields: [
        { name: 'title', label: 'Заголовок', type: 'text' },
        { name: 'description', label: 'Описание', type: 'textarea' },
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
          throw new Error(`Домен уже занят: ${clash.join(', ')}`)
        }
        return next
      },
    ],
  },
}
