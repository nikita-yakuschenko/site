'use client'

import { Badge } from '../ui/badge'
import { useFormFields } from '@payloadcms/ui'
import { projectContentSources, projectSourceLabels, type ProjectContentBlock } from '../../config/project-content-sources'

export function ProjectSectionLabel({ title, blockKey }: { title: string; blockKey: ProjectContentBlock }) {
  const heroSource = useFormFields(([fields]) => fields.heroContentSource?.value)
  const exteriorsSource = useFormFields(([fields]) => fields.exteriorsContentSource?.value)
  const interiorsSource = useFormFields(([fields]) => fields.interiorsContentSource?.value)
  const plansSource = useFormFields(([fields]) => fields.plansContentSource?.value)
  const builtSource = useFormFields(([fields]) => fields.builtContentSource?.value)
  const source = (blockKey === 'projectHero' && heroSource === 'database') || (blockKey === 'ProjectExteriors' && exteriorsSource === 'database') || (blockKey === 'ProjectInteriors' && interiorsSource === 'database') || (blockKey === 'ProjectPlans' && plansSource === 'database') || (blockKey === 'ProjectBuilt' && builtSource === 'database') ? 'database' : projectContentSources[blockKey]
  const status = projectSourceLabels[source]
  const description = blockKey === 'MortgageCalculator' ? 'Общий ипотечный калькулятор. На странице проекта отдельно не настраивается.'
    : blockKey === 'ProjectNextSteps' ? 'Общий блок. Для проекта настраиваются показ и порядок карточек.' : status.description
  return <span className="project-source-label shadcn-surface">
    <span className="project-source-label__title">{title}</span>
    <Badge variant="outline" className="project-source-label__badge" data-content-source={source} title={source === 'system' ? undefined : description} aria-label={source === 'system' ? status.label : `Источник содержимого: ${status.label}. ${description}`}>{status.label}</Badge>
  </span>
}
