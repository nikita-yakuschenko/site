'use client'
import { useField } from '@payloadcms/ui'
import type { UIFieldClientProps } from 'payload'
import { Button } from '../ui/button'
import { IconEye } from '@tabler/icons-react'

export function ProjectNextStepsContent({ path }: UIFieldClientProps) {
  const { value } = useField<string>({ path: 'recordType' })
  const parts = [{ key: 'ProjectNextSteps.visit', title: 'Посмотрите дом вживую' }, value === 'ready-home' ? { key: 'ProjectNextSteps.review', title: 'Обзор дома' } : { key: 'ProjectNextSteps.consult', title: 'Консультация с архитектором' }]
  return <div className="shadcn-surface flex flex-col gap-2">{parts.map(part => <Button key={part.key} type="button" variant="ghost" className="justify-start" onClick={() => window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path: path.replace(/nextStepsContent$/, 'ProjectNextStepsPreview'), ...part } }))}><IconEye className="size-4" />{part.title}</Button>)}</div>
}
