'use client'
import { useCollapsible } from '@payloadcms/ui'
import { useEffect } from 'react'
import type { UIFieldClientProps } from 'payload'

export function ProjectSectionPreview({ path, field }: UIFieldClientProps) {
  const { isCollapsed } = useCollapsible()
  const key = field.name.replace(/Preview$/, '')
  const title = ({ projectHero: 'Главный экран', ProjectExteriors: 'Рендеры фасадов', ProjectPlans: 'Планировки', ProjectInteriors: 'Рендеры интерьеров', ProjectBuilt: 'Построенные дома', MortgageCalculator: 'Ипотечный калькулятор', ProjectConfig: 'Комплектации', ReadyHomeOffer: 'Условия продажи готового дома', ProjectNextSteps: 'Просмотр дома и консультация', ProjectSimilar: 'Похожие проекты', contactsSection: 'Контакты' } as Record<string, string>)[key]
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path, key, title, closed: isCollapsed } }))
    // Collapsed content unmounts, so release the selection on unmount too
    return () => { window.dispatchEvent(new CustomEvent('avgst:preview-selection', { detail: { path, closed: true } })) }
  }, [path, key, title, isCollapsed])
  return null
}
