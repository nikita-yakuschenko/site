'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { IconCopy } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'

export function useProjectCopy() {
  const router = useRouter(), { user } = useAuth()
  const lock = useRef(false), [copying, setCopying] = useState<number | null>(null)
  const allowed = ['super-admin', 'admin', 'editor'].includes(String(user?.role))
  const copy = async (id: number) => {
    if (lock.current || !allowed) return
    lock.current = true; setCopying(id)
    try {
      const response = await fetch(`/api/projects/${id}/copy`, { method: 'POST', credentials: 'include' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Не удалось дублировать проект')
      toast.success('Копия проекта создана как черновик')
      router.push(`/collections/projects/${result.doc.id}`)
      router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Не удалось дублировать проект') }
    finally { lock.current = false; setCopying(null) }
  }
  return { copy, copying, allowed }
}

export function ProjectCopyButton() {
  const { id } = useDocumentInfo(), modified = useFormModified()
  const { copy, copying, allowed } = useProjectCopy()
  if (!id || !allowed) return null
  return <Button type="button" size="icon-sm" variant="ghost" disabled={modified || copying !== null} onClick={() => void copy(Number(id))} aria-label="Дублировать проект" title={modified ? 'Сохраните изменения перед дублированием' : 'Дублировать проект'}><IconCopy className="size-4" /></Button>
}
