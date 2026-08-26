'use client'

import { IconLogout } from '@tabler/icons-react'
import { Link, useConfig, useTranslation } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

export function AdminLogout() {
  const { t } = useTranslation()
  const { config } = useConfig()
  const href = formatAdminURL({
    adminRoute: config.routes.admin,
    path: config.admin.routes.logout,
  })

  return (
    <Link
      aria-label={t('authentication:logOut')}
      className="avgst-logout"
      href={href}
      prefetch={false}
      title={t('authentication:logOut')}
    >
      <IconLogout size={18} stroke={1.5} />
    </Link>
  )
}

export function AdminNavLogout() {
  return null
}
