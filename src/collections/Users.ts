import type { CollectionConfig } from 'payload'
import { authenticated, fieldHqOnly, hqOnly, isLoggedIn, usersCreate } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      options: [
        { label: 'Super admin', value: 'super-admin' },
        { label: 'HQ admin', value: 'hq-admin' },
        { label: 'HQ editor', value: 'hq-editor' },
        { label: 'Partner owner', value: 'partner-owner' },
        { label: 'Partner editor', value: 'partner-editor' },
        { label: 'Viewer', value: 'viewer' },
      ],
      access: {
        update: fieldHqOnly,
      },
    },
    {
      name: 'partnerExternalId',
      type: 'text',
      admin: {
        description: 'Stable partner id from the operational system. Empty for HQ users.',
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
