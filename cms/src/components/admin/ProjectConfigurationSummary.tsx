'use client'

import { useFormFields } from '@payloadcms/ui'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { configurationKeys, isModularTechnology } from '../../../../src/lib/catalog/configuration-rules'
import { tierDefinitions } from '../../../../src/lib/catalog/tiers'
import { sharedConfigurationContent, type ConfigurationTemplatesData } from '../../../../src/lib/catalog/configuration-content'

export function ProjectConfigurationSummary() {
  const technology = useFormFields(([fields]) => fields.technologyBadge?.value)
  const keys = configurationKeys(isModularTechnology(technology))
  const [templates, setTemplates] = useState<ConfigurationTemplatesData>({})
  const [error, setError] = useState(false)
  const [blockId, setBlockId] = useState<number | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/blocks?where[key][equals]=ProjectConfig&limit=1&depth=0', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('templates-unavailable')
      const data = await response.json()
      setTemplates(data.docs?.[0]?.configurationTemplates || {})
      setBlockId(data.docs?.[0]?.id || null)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [])
  const content = sharedConfigurationContent(templates, String(technology || ''))
  return <div className="shadcn-surface flex flex-col gap-3">
    <Link href={blockId ? `/collections/blocks/${blockId}` : '/collections/blocks?where[key][equals]=ProjectConfig'} className="self-start rounded-lg border px-3 py-2 text-sm font-medium">Редактировать блок «Комплектации»</Link>
    <p className="text-sm text-muted-foreground">Состав и описания общие для всех проектов. Набор определяется технологией дома. Цены загружаются из файла или через API в <Link href="/structure/catalog">региональный прайс</Link>.</p>
    {error && <p role="alert" className="text-sm">Не удалось загрузить общие описания. Откройте редактор комплектаций или обновите страницу.</p>}
    {keys.map(key => {
      const tier = { ...tierDefinitions.find(tier => tier.id === key)!, ...content.find(tier => tier.key === key) }
      return <details key={key} className="rounded-lg border bg-muted/30 p-3">
        <summary className="cursor-pointer font-medium">{tier.name}</summary>
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <p>{tier.lead}</p>
          <ul className="list-disc pl-5 space-y-1">{tier.includes.map(item => <li key={item}>{item}</li>)}</ul>
          {!!tier.gifts?.length && <div><p className="font-medium">В подарок</p><ul className="list-disc pl-5">{tier.gifts.map(item => <li key={item}>{item}</li>)}</ul></div>}
          {tier.details.map(detail => <details key={detail.title} className="border-t pt-2"><summary className="cursor-pointer font-medium">{detail.title}</summary><div className="mt-2 space-y-2">{detail.lead && <p>{detail.lead}</p>}{!!detail.items?.length && <ul className="list-disc pl-5">{detail.items.map(item => <li key={item}>{item}</li>)}</ul>}{detail.groups?.map(group => <div key={group.title}><p className="font-medium">{group.title}</p><ul className="list-disc pl-5">{group.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></details>)}
          {!tier.mortgage && <p className="text-muted-foreground">Эта комплектация не подходит для ипотеки.</p>}
        </div>
      </details>
    })}
  </div>
}
