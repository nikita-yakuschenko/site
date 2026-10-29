'use client'

import { toast, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { IconCheck, IconLoader2 } from '@tabler/icons-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { configurationName, isModularTechnology, priceConfigurationKeys, type ConfigurationKey } from '../../../../src/lib/catalog/configuration-rules'
import { priceKindsInForm, type PriceKind } from '../../config/price-kinds'

type PriceDoc = { id: string; configuration: ConfigurationKey; region: PriceKind; price: number }
type Status = 'saving' | 'saved' | undefined

const cellKey = (configuration: string, region: string) => `${configuration}:${region}`
const formatPrice = (value: number | undefined) => value ? value.toLocaleString('ru-RU') : ''
const parsePrice = (text: string) => Number(text.replace(/\D/g, '')) || 0

async function request(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json' } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.errors?.[0]?.message || 'Не удалось сохранить цену')
  return body
}

export function ProjectPricesEditor() {
  const { id } = useDocumentInfo()
  const technology = useFormFields(([fields]) => fields.technologyBadge?.value)
  const modular = isModularTechnology(technology)
  const keys = priceConfigurationKeys(modular)
  // Older projects keep the NN price on the project itself; the site falls back to it.
  const legacyPrices = useFormFields(([fields]) => JSON.stringify(Object.fromEntries([0, 1, 2, 3].map(index => [fields[`configurations.${index}.key`]?.value, fields[`configurations.${index}.price`]?.value]).filter(([key, price]) => key && typeof price === 'number' && price > 0))))
  const legacy = JSON.parse(legacyPrices) as Partial<Record<ConfigurationKey, number>>
  const [docs, setDocs] = useState<Record<string, PriceDoc>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    fetch(`/api/project-prices?where[project][equals]=${id}&limit=100&depth=0`, { signal: controller.signal, credentials: 'include' }).then(async response => {
      if (!response.ok) throw new Error('prices-unavailable')
      const data = await response.json() as { docs: PriceDoc[] }
      setDocs(Object.fromEntries(data.docs.map(doc => [cellKey(doc.configuration, doc.region), doc])))
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [id])

  // Each cell writes its own price record; the project form is not touched.
  const commit = async (configuration: ConfigurationKey, region: PriceKind) => {
    const key = cellKey(configuration, region)
    if (!(key in drafts)) return
    const price = parsePrice(drafts[key])
    const existing = docs[key]
    setDrafts(current => { const next = { ...current }; delete next[key]; return next })
    if ((existing?.price || 0) === price) return
    setStatus(current => ({ ...current, [key]: 'saving' }))
    try {
      if (!price && existing) {
        await request(`/api/project-prices/${existing.id}`, { method: 'DELETE' })
        setDocs(current => { const next = { ...current }; delete next[key]; return next })
      } else if (existing) {
        const body = await request(`/api/project-prices/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ price }) })
        setDocs(current => ({ ...current, [key]: body.doc }))
      } else {
        const body = await request('/api/project-prices', { method: 'POST', body: JSON.stringify({ project: id, configuration, region, price }) })
        setDocs(current => ({ ...current, [key]: body.doc }))
      }
      setStatus(current => ({ ...current, [key]: 'saved' }))
      setTimeout(() => setStatus(current => current[key] === 'saved' ? { ...current, [key]: undefined } : current), 1500)
    } catch (reason) {
      setStatus(current => ({ ...current, [key]: undefined }))
      toast.error(reason instanceof Error ? reason.message : 'Не удалось сохранить цену')
    }
  }

  if (!id) return <p className="shadcn-surface text-sm text-muted-foreground">Сохраните проект, чтобы задать цены.</p>

  return <div className="shadcn-surface flex flex-col gap-3">
    <p className="text-sm text-muted-foreground">Сверху тип цены, внутри — стоимость каждой комплектации. Цена сохраняется сразу после ввода. Пустое поле — цена не задана.</p>
    {error && <p role="alert" className="text-sm">Не удалось загрузить цены. Обновите страницу.</p>}
    <Accordion type="multiple" className="flex flex-col gap-2">
      {priceKindsInForm.map(kind => <AccordionItem key={kind.value} value={kind.value} className="rounded-lg border bg-card px-4 last:border-b">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-baseline gap-2">{kind.label}{!kind.public && <span className="text-sm font-normal text-muted-foreground">не показывается на сайте</span>}</span>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 px-1 pt-1 pb-4">
          {keys.map(configuration => {
            const key = cellKey(configuration, kind.value)
            const value = key in drafts ? drafts[key] : formatPrice(docs[key]?.price)
            return <label key={configuration} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-sm">{configurationName(configuration, technology)}{modular && configuration === 'start' && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">не на сайте</span>}</span>
              <span className="relative w-48">
                <Input inputMode="numeric" className="h-8 pr-7 text-right tabular-nums" placeholder={kind.value === 'nn' && legacy[configuration] ? formatPrice(legacy[configuration]) : '—'} value={value} aria-label={`${kind.label}: ${configurationName(configuration, technology)}`}
                  onChange={event => { const text = event.target.value; setDrafts(current => ({ ...current, [key]: formatPrice(parsePrice(text)) })) }}
                  onBlur={() => void commit(configuration, kind.value)}
                  onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">₽</span>
              </span>
              <span className="flex size-4 text-muted-foreground" aria-live="polite">
                {status[key] === 'saving' ? <IconLoader2 className="size-4 animate-spin" /> : status[key] === 'saved' ? <IconCheck className="size-4 text-primary" aria-label="Сохранено" /> : null}
              </span>
            </label>
          })}
        </AccordionContent>
      </AccordionItem>)}
    </Accordion>
  </div>
}
