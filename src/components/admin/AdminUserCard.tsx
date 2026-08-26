'use client'

import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLock, IconLockOpen, IconShield, IconUser } from '@tabler/icons-react'
import {
  Button,
  toast,
  useAuth,
  useConfig,
  useDocumentInfo,
  useFormFields,
} from '@payloadcms/ui'
import { isHqRole } from '../../access'
import { formatDateTime } from '../../lib/locale'

const ROLE_LABEL: Record<string, string> = {
  'super-admin': 'Суперадмин',
  'hq-admin': 'Админ штаба',
  'hq-editor': 'Редактор штаба',
  'partner-owner': 'Владелец партнёра',
  'partner-editor': 'Редактор партнёра',
  viewer: 'Наблюдатель',
}

function initials(first?: string | null, last?: string | null, email?: string | null) {
  const a = first?.trim().charAt(0)
  const b = last?.trim().charAt(0)
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase()
  return (email?.trim().charAt(0) || '?').toUpperCase()
}

export function AdminUserHeader() {
  const doc = useDocumentInfo()
  const firstName = useFormFields(([fields]) => fields.firstName?.value as string | undefined)
  const lastName = useFormFields(([fields]) => fields.lastName?.value as string | undefined)
  const email = useFormFields(([fields]) => fields.email?.value as string | undefined)
  const role = useFormFields(([fields]) => fields.role?.value as string | undefined)
  const blocked = useFormFields(([fields]) => fields.blocked?.value as boolean | undefined)
  const data = doc?.data as
    | { firstName?: string; lastName?: string; email?: string; role?: string; blocked?: boolean }
    | undefined

  const first = firstName ?? data?.firstName
  const last = lastName ?? data?.lastName
  const mail = email ?? data?.email
  const roleValue = role ?? data?.role
  const roleLabel = roleValue ? ROLE_LABEL[roleValue] || roleValue : ''
  const isBlocked = Boolean(blocked ?? data?.blocked)

  const [host, setHost] = useState<HTMLElement | null | undefined>(undefined)

  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(
      '.template-default__wrap:has(.collection-edit--users) .doc-header__header',
    )
    setHost(header)
  }, [])

  const body = (
    <div className="avgst-user-id">
      <div aria-hidden="true" className="avgst-user-id__avatar">
        {initials(first, last, mail)}
      </div>
      <div className="avgst-user-id__meta">
        {mail ? <span className="avgst-user-id__email">{mail}</span> : null}
        {roleLabel ? <span className="avgst-user-id__role">{roleLabel}</span> : null}
        {isBlocked ? <span className="avgst-user-id__blocked">Заблокирован</span> : null}
      </div>
    </div>
  )

  if (host === undefined) return null
  if (!host) return body
  return (
    <>
      <span aria-hidden className="avgst-user-id-field" hidden />
      {createPortal(body, host)}
    </>
  )
}

export function AdminUserLock() {
  const doc = useDocumentInfo()
  const { user } = useAuth()
  const { config } = useConfig()
  const dispatch = useFormFields(([, next]) => next)
  const blockedField = useFormFields(([fields]) => fields.blocked?.value as boolean | undefined)
  const data = doc?.data as { blocked?: boolean; email?: string } | undefined
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(Boolean(blockedField ?? data?.blocked))

  useLayoutEffect(() => {
    setLocked(Boolean(blockedField ?? data?.blocked))
  }, [blockedField, data?.blocked])

  useLayoutEffect(() => {
    const find = () => {
      setHost(document.querySelector<HTMLElement>('.collection-edit--users .auth-fields__controls'))
    }
    find()
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const id = doc?.id
  const isSelf = user?.id != null && id != null && String(user.id) === String(id)
  const canToggle = isHqRole((user as { role?: string } | null)?.role) && Boolean(id)

  if (!canToggle || !host) {
    return <span aria-hidden className="avgst-user-lock-field" hidden />
  }

  const toggle = async () => {
    if (!id || busy || isSelf) return
    const next = !locked
    setBusy(true)
    try {
      const api = config.routes.api
      const patch = await fetch(`${api}/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: next }),
      })
      if (!patch.ok) throw new Error('patch')
      if (!next && data?.email) {
        await fetch(`${api}/users/unlock`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email }),
        })
      }
      dispatch({ type: 'UPDATE', path: 'blocked', value: next, valid: true })
      setLocked(next)
      toast.success(next ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
    } catch {
      toast.error('Не удалось изменить блокировку')
    } finally {
      setBusy(false)
    }
  }

  const Icon = locked ? IconLockOpen : IconLock

  return (
    <>
      <span aria-hidden className="avgst-user-lock-field" hidden />
      {createPortal(
        <Button
          buttonStyle="secondary"
          disabled={busy || isSelf}
          id="avgst-user-lock"
          onClick={() => void toggle()}
          size="medium"
          tooltip={isSelf ? 'Нельзя заблокировать свою учётную запись' : undefined}
        >
          <Icon size={16} stroke={1.5} />
          {locked ? 'Разблокировать' : 'Заблокировать'}
        </Button>,
        host,
      )}
    </>
  )
}

export function AdminUserSection(props: { field?: { name?: string }; path?: string }) {
  const access = (props.field?.name || props.path) === 'accessHeading'
  const Icon = access ? IconShield : IconUser

  return (
    <div className="avgst-user-section">
      <Icon size={18} stroke={1.5} />
      <span>{access ? 'Доступ и роль' : 'Основные данные'}</span>
    </div>
  )
}

export function AdminUserStamp() {
  const doc = useDocumentInfo()
  const data = doc?.data as { createdAt?: string; updatedAt?: string } | undefined
  const created = data?.createdAt
  const updated = data?.updatedAt
  const [host, setHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setHost(
      document.querySelector<HTMLElement>(
        '.collection-edit--users .document-fields--has-sidebar',
      ),
    )
  }, [])

  if (!created && !updated) {
    return <span aria-hidden className="avgst-user-stamp-field" hidden />
  }

  const body = (
    <p className="avgst-user-stamp">
      {updated ? <span>Изменён: {formatDateTime(updated)}</span> : null}
      {created ? <span>Создан: {formatDateTime(created)}</span> : null}
    </p>
  )

  if (!host) return body
  return (
    <>
      <span aria-hidden className="avgst-user-stamp-field" hidden />
      {createPortal(body, host)}
    </>
  )
}
