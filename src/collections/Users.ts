import type { CollectionConfig } from 'payload'
import { authenticated, fieldHqOnly, hqOnly, isLoggedIn, usersCreate } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: {
    useAsTitle: 'email',
    group: 'Система',
    defaultColumns: ['email', 'role', 'createdAt'],
  },
  auth: true,
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Почта',
      required: true,
      unique: true,
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
    },
    {
      name: 'partnerExternalId',
      label: 'ID партнёра',
      type: 'text',
      admin: {
        description: 'Стабильный идентификатор партнёра из операционной системы. Для сотрудников штаба оставьте пустым.',
      },
      access: {
        update: fieldHqOnly,
      },
    },
  ],
  access: {
    admin: isLoggedIn,
    read: authenticated,
    create: usersCreate,
    update: authenticated,
    delete: hqOnly,
  },
}
