'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { configurationKeys, configurationNames, type ConfigurationKey } from '../../../../src/lib/catalog/configuration-rules'
import { PagePreview } from './PagePreview'

export function ConfigurationBlockEditor({ variant, siteUrl }: { variant: 'panel' | 'modular' | 'frame'; siteUrl: string }) {
  const keys = configurationKeys(variant === 'modular')
  const [selected, setSelected] = useState<ConfigurationKey>('standard')
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = ref.current?.closest('.configuration-block-settings')
    const wrap = root?.querySelector<HTMLElement>(':scope > .group-field__wrap')
    if (!root || !wrap) return
    setHost(wrap)
    const refresh = () => {
      const visible = !ref.current?.closest('.tabs-field__tab--hidden')
      setActive(previous => previous === visible ? previous : visible)
      if (!visible) return
      root.querySelectorAll<HTMLElement>('.configuration-tier-group').forEach(group => {
        const hidden = !group.id.endsWith(`__${variant}__${selected}`)
        if (group.classList.contains('configuration-tier-hidden') !== hidden) group.classList.toggle('configuration-tier-hidden', hidden)
      })
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [selected, variant])
  return <>
    <div ref={ref} className="configuration-editor-nav shadcn-surface">
      <div className="configuration-editor-tabs" role="group" aria-label="Редактируемая комплектация">
        {keys.map(key => <button key={key} type="button" aria-pressed={selected === key} onClick={() => setSelected(key)}>{configurationNames[key]}</button>)}
      </div>
      <p>Общий состав для всех проектов выбранной технологии.</p>
    </div>
    {host && active && createPortal(<aside className="configuration-editor-preview shadcn-surface">
      <PagePreview siteUrl={siteUrl} configuration={{ variant, tier: selected }} />
      <p>Цены задаются отдельно для проекта и региона.</p>
    </aside>, host)}
  </>
}
