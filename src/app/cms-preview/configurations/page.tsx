'use client'

import { useEffect, useState } from 'react'
import { ProjectConfig } from '../../../components/project-config'
import { sharedConfigurationContent, type ConfigurationTemplatesData } from '../../../lib/catalog/configuration-content'
import { configurationKeys } from '../../../lib/catalog/configuration-rules'
import { configurationTiers } from '../../../lib/catalog/project-configurations-data'
import type { CatalogProject } from '../../../lib/catalog/types'

const project: CatalogProject = { id: 'configuration-preview', slug: 'configuration-preview', name: 'Проект дома', area: '', areaValue: 0, floors: '', floorsValue: 1, bedrooms: '', bathrooms: '', priceLabel: 'Цена уточняется', priceAmount: null, imageUrl: '', technologyBadge: 'Панельно-каркасный', technology: 'panel', series: 'panel', href: '#', description: '', about: [], exteriors: [], interiors: [], floorPlans: [], options: [] }
export default function ConfigurationPreviewPage() {
  const [draft, setDraft] = useState<{ templates: ConfigurationTemplatesData; variant: 'panel' | 'modular' } | null>(null)
  const [tier, setTier] = useState('standard')
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !['http://localhost:3001', 'http://127.0.0.1:3001', 'https://cms.avgst.ru'].includes(event.origin) || event.data?.type !== 'avgst:preview-configurations') return
      if (!['panel', 'modular'].includes(event.data.variant) || !event.data.templates || typeof event.data.templates !== 'object') return
      setDraft({ templates: event.data.templates, variant: event.data.variant })
      if (configurationKeys(event.data.variant === 'modular').includes(event.data.tier)) setTier(event.data.tier)
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'avgst:configurations-ready' }, '*')
    return () => window.removeEventListener('message', receive)
  }, [])
  if (!draft) return <p style={{ padding: 24 }}>Загрузка предпросмотра…</p>
  const badge = draft.variant === 'modular' ? 'Модульный' : 'Панельно-каркасный'
  const tiers = configurationTiers(configurationKeys(draft.variant === 'modular').map(key => ({ key, price: 0 })), badge, sharedConfigurationContent(draft.templates, badge))!
  return <ProjectConfig project={{ ...project, technologyBadge: badge, technology: draft.variant }} configurations={tiers} previewTier={tier} onPreviewTierChange={setTier} />
}
