'use client'

import Link from 'next/link'
import { useAuth, useListQuery } from '@payloadcms/ui'
import { IconPhoto, IconPlus, IconSearch, IconUsers } from '@tabler/icons-react'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'

function CollectionEmptyState({ slug }: { slug: 'media' | 'users' }) {
  const { data, query } = useListQuery()
  const { permissions } = useAuth()
  if (!data || data.docs.length > 0) return null
  const filtered = Boolean(query.search || query.where && Object.keys(query.where).length)
  const media = slug === 'media'
  const href = `/collections/${slug}`
  return <EmptyState
    icon={filtered ? <IconSearch /> : media ? <IconPhoto /> : <IconUsers />}
    title={filtered ? 'Ничего не найдено' : media ? 'Пока нет медиафайлов' : 'Пока нет пользователей'}
    description={filtered ? 'Попробуйте другой запрос или сбросьте фильтры.' : media ? 'Добавьте первый файл, чтобы начать наполнять медиатеку.' : 'Создайте пользователя, чтобы предоставить доступ к панели управления.'}
  >
    {filtered ? <Button asChild variant="outline"><a href={href}>Сбросить фильтры</a></Button> : permissions?.collections?.[slug]?.create && <Button asChild><Link href={`${href}/create`}><IconPlus />{media ? 'Создать медиафайл' : 'Создать пользователя'}</Link></Button>}
  </EmptyState>
}

export function MediaEmptyState() { return <CollectionEmptyState slug="media" /> }
export function UsersEmptyState() { return <CollectionEmptyState slug="users" /> }
