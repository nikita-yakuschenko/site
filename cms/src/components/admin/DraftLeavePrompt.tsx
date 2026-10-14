'use client'

import { useForm } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'

type Saved = { id: string; name: string } | 'saving' | 'error'

// Leaving the create screen keeps the new project as a draft
export function DraftLeavePrompt() {
  const { getData } = useForm()
  const router = useRouter()
  const [target, setTarget] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved>('saving')

  useEffect(() => {
    const saveDraft = async () => {
      setSaved('saving')
      const response = await fetch('/api/projects?draft=true', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...getData(), _status: 'draft' }) }).catch(() => null)
      const doc = response?.ok ? (await response.json()).doc : null
      setSaved(doc ? { id: doc.id, name: doc.name } : 'error')
    }
    // Window capture runs before Payload's own leave-without-saving guard
    const intercept = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a')
      if (!anchor || target || anchor.target === '_blank' || anchor.download || event.metaKey || event.ctrlKey) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      event.preventDefault()
      event.stopImmediatePropagation()
      setTarget(url.pathname + url.search)
      void saveDraft()
    }
    window.addEventListener('click', intercept, true)
    return () => window.removeEventListener('click', intercept, true)
  }, [getData, target])

  const draft = typeof saved === 'object' ? saved : null
  // Staying continues editing the saved draft instead of a second new record
  const stay = () => { if (draft) router.replace(`/collections/projects/${draft.id}`); else setTarget(null) }
  const leave = () => { if (target) router.push(target) }
  // The draft is stored up front to show its real ID, so discarding removes it
  const discard = async () => {
    if (draft) await fetch(`/api/projects/${draft.id}`, { method: 'DELETE', credentials: 'include' }).catch(() => null)
    leave()
  }
  const busy = saved === 'saving'

  return <Dialog open={!!target} onOpenChange={open => { if (!open && !busy) stay() }}>
    <DialogContent className="shadcn-surface sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{saved === 'error' ? 'Не удалось сохранить черновик' : 'Проект будет сохранён как черновик'}</DialogTitle>
        {saved === 'error'
          ? <DialogDescription>Если закрыть без сохранения, введённые данные пропадут.</DialogDescription>
          : <>
            <p className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-semibold">{draft?.name ?? 'Сохранение…'}</p>
            <DialogDescription>Проект не будет опубликован на сайте, но будет доступен для редактирования в каталоге.</DialogDescription>
          </>}
      </DialogHeader>
      <ul className="grid gap-1.5 text-sm text-muted-foreground">
        <li><span className="font-medium text-foreground">Сохранить и закрыть</span> — выйти из редактирования и сохранить черновик</li>
        <li><span className="font-medium text-foreground">Остаться</span> — продолжить редактирование</li>
        <li><span className="font-medium text-foreground">Не сохранять черновик</span> — закрыть без сохранения</li>
      </ul>
      <DialogFooter className="sm:justify-between">
        <Button variant="link" className="px-0 text-muted-foreground" disabled={busy} onClick={discard}>Не сохранять черновик</Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" disabled={busy} onClick={stay}>Остаться</Button>
          {saved !== 'error' && <Button disabled={busy} onClick={leave}>Сохранить и закрыть</Button>}
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
