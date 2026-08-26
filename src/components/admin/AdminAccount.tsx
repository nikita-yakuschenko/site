'use client'

import md5 from 'md5'
import { useAuth } from '@payloadcms/ui'

type AccountUser = {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

export function AdminAccount() {
  const { user } = useAuth()
  const account = user as AccountUser | null | undefined
  const email = account?.email?.trim() || ''
  const name = [account?.firstName, account?.lastName].filter(Boolean).join(' ').trim()
  const label = name || email
  const hash = email ? md5(email.toLowerCase()) : ''

  return (
    <span className="avgst-account">
      {hash ? (
        <img
          alt=""
          className="avgst-account__photo"
          height={24}
          src={`https://www.gravatar.com/avatar/${hash}?default=mp&r=g&s=48`}
          width={24}
        />
      ) : (
        <span className="avgst-account__photo avgst-account__photo--empty" />
      )}
      {label ? <span className="avgst-account__name">{label}</span> : null}
    </span>
  )
}
