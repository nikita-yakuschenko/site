import { LockedAuth, type CollectionConfig } from 'payload'
import { authenticated, fieldHqOnly, hqOnly, isLoggedIn, usersCreate } from '../access'

function personName(
  first?: string | null,
  last?: string | null,
  email?: string | null,
) {
  return [first, last].filter(Boolean).join(' ').trim() || email?.trim() || ''
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: {
    useAsTitle: 'fullName',
    group: 'Система',
    defaultColumns: ['fullName', 'email', 'role'],
    listSearchableFields: ['fullName', 'firstName', 'lastName', 'email'],
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/AdminUserEditGate#AdminUserEditGate'],
      },
    },
  },
  auth: true,
  disableDuplicate: true,
  hooks: {
    beforeOperation: [
      async ({ args, operation }) => {
        if (operation !== 'login') return args
        const email =
          typeof args.data?.email === 'string' ? args.data.email.toLowerCase().trim() : ''
        if (!email) return args
        const found = await args.req.payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        const user = found.docs[0] as { blocked?: boolean | null } | undefined
        if (user?.blocked) throw new LockedAuth(args.req.t)
        return args
      },
    ],
    beforeChange: [
      ({ data }) => {
        data.fullName = personName(data.firstName, data.lastName, data.email)
        return data
      },
    ],
    afterRead: [
      ({ doc }) => {
        if (!doc.fullName) {
          doc.fullName = personName(doc.firstName, doc.lastName, doc.email)
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'Имя',
      admin: {
        condition: () => false,
        disableListFilter: true,
      },
    },
    {
      name: 'profileHeader',
      type: 'ui',
      admin: {
        disableListColumn: true,
        components: { Field: '/components/admin/AdminUserCard#AdminUserHeader' },
      },
    },
    {
      name: 'basicHeading',
      type: 'ui',
      admin: {
        disableListColumn: true,
        components: { Field: '/components/admin/AdminUserCard#AdminUserSection' },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'firstName',
          type: 'text',
          label: 'Имя',
          admin: { width: '50%', disableListColumn: true },
        },
        {
          name: 'lastName',
          type: 'text',
          label: 'Фамилия',
          admin: { width: '50%', disableListColumn: true },
        },
      ],
    },
    {
      name: 'email',
      type: 'email',
      label: 'Почта',
      required: true,
      unique: true,
    },
    {
      name: 'accessHeading',
      type: 'ui',
      admin: {
        position: 'sidebar',
        disableListColumn: true,
        components: { Field: '/components/admin/AdminUserCard#AdminUserSection' },
      },
    },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      options: [
        { label: 'Суперадмин', value: 'super-admin' },
        { label: 'Админ штаба', value: 'hq-admin' },
        { label: 'Редактор штаба', value: 'hq-editor' },
        { label: 'Владелец партнёра', value: 'partner-owner' },
        { label: 'Редактор партнёра', value: 'partner-editor' },
        { label: 'Наблюдатель', value: 'viewer' },
      ],
      access: {
        update: fieldHqOnly,
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'partnerExternalId',
      label: 'ID партнёра',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Из операционной системы. Для сотрудников штаба оставьте пустым.',
      },
      access: {
        update: fieldHqOnly,
      },
    },
    {
      name: 'blocked',
      type: 'checkbox',
      label: 'Заблокирован',
      defaultValue: false,
      access: {
        update: fieldHqOnly,
      },
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      name: 'accountLock',
      type: 'ui',
      admin: {
        disableListColumn: true,
        components: { Field: '/components/admin/AdminUserCard#AdminUserLock' },
      },
    },
    {
      name: 'recordStamp',
      type: 'ui',
      admin: {
        disableListColumn: true,
        components: { Field: '/components/admin/AdminUserCard#AdminUserStamp' },
      },
    },
  ],
  access: {
    admin: isLoggedIn,
    read: authenticated,
    create: usersCreate,
    update: authenticated,
    // Удаление только заблокированных; активных через UI/API не удалить.
    delete: ({ req }) => {
      if (hqOnly({ req }) !== true) return false
      return { blocked: { equals: true } }
    },
  },
}
