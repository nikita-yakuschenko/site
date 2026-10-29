'use client'
import { useFormFields, useRowLabel } from '@payloadcms/ui'
import { configurationName, configurationNames, type ConfigurationKey } from '../../../../src/lib/catalog/configuration-rules'
export function ConfigurationRowLabel() {
  const { data } = useRowLabel<{ name?: string; price?: number; key?: string }>()
  const technology = useFormFields(([fields]) => fields.technologyBadge?.value)
  const name = data.key && data.key in configurationNames ? configurationName(data.key as ConfigurationKey, technology) : data.name || 'Комплектация'
  return <span className="flex w-full items-center justify-between gap-3"><span>{name}</span>{typeof data.price === 'number' && <span className="text-muted-foreground tabular-nums">{data.price.toLocaleString('ru-RU')} ₽</span>}</span>
}
