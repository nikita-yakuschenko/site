import { APIError, AuthenticationError, type CollectionConfig } from 'payload'
import { bootstrapFirstAdmin } from '../access/bootstrap-context'
import { activeStaff, authenticated, ownAccountOrSuper, privilegedField, superAdmin } from '../access/staff'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'firstName', 'lastName', 'role', 'isBlocked'] },
  timestamps: true,
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useSessions: true,
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Strict' },
  },
  access: {
    admin: authenticated,
    create: superAdmin,
    read: ownAccountOrSuper,
    update: ownAccountOrSuper,
    delete: superAdmin,
    unlock: superAdmin,
  },
  hooks: {
    beforeOperation: [({ args, operation }) => {
      // No SMTP adapter is configured. Payload's development mail adapter
      // must never print password-reset links to infrastructure logs.
      if (operation === 'forgotPassword' || operation === 'resetPassword') {
        throw new APIError('Восстановление пароля через почту пока не настроено', 403)
      }
      return args
    }],
    beforeLogin: [({ user, req }) => {
      if (user.isBlocked) throw new AuthenticationError(req.t)
      return user
    }],
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      if (operation === 'create' && req.context[bootstrapFirstAdmin as unknown as string] === true) return data
      const actor = await activeStaff(req)
      if (!actor) throw new APIError('Доступ запрещён', 403)
      if (actor.role !== 'super-admin') {
        if (operation === 'create' || originalDoc?.id !== actor.id || originalDoc?.role === 'super-admin') {
          throw new APIError('Доступ запрещён', 403)
        }
        if (data.role !== undefined && data.role !== originalDoc.role || data.isBlocked !== undefined && data.isBlocked !== originalDoc.isBlocked) {
          throw new APIError('Изменение полномочий запрещено', 403)
        }
      }
      // Payload's JWT strategy checks the session against the current DB record.
      // Revocation closes built-in endpoints as well as our collection ACLs.
      if (data.isBlocked === true) data.sessions = []
      return data
    }],
    beforeDelete: [async ({ id, req }) => {
      const actor = await activeStaff(req)
      if (actor?.role !== 'super-admin' || actor.id === id) throw new APIError('Доступ запрещён', 403)
    }],
  },
  fields: [
    { name: 'firstName', type: 'text', label: 'Имя', required: true },
    { name: 'lastName', type: 'text', label: 'Фамилия', required: true },
    {
      name: 'role', type: 'select', label: 'Роль', required: true, defaultValue: 'viewer',
      access: { create: privilegedField, update: privilegedField },
      options: [
        { label: 'Супрадмин', value: 'super-admin' },
        { label: 'Администратор', value: 'admin' },
        { label: 'Редактор', value: 'editor' },
        { label: 'Наблюдатель', value: 'viewer' },
      ],
    },
    { name: 'isBlocked', type: 'checkbox', label: 'Заблокирован', defaultValue: false, access: { create: privilegedField, update: privilegedField } },
  ],
}
