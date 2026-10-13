'use client'

import { useCallback, useEffect, useState } from 'react'
import { ErrorPill, RenderFields, useDocumentInfo, useField, usePreferences, useTranslation, WatchChildErrors } from '@payloadcms/ui'
import type { ClientField, CollapsibleFieldClientProps } from 'payload'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Card } from '../ui/card'

type SectionPrefs = { fields?: Record<string, { collapsed?: boolean }> }

export function ProjectSectionCard({ field, indexPath, parentPath, parentSchemaPath, path, permissions, readOnly }: CollapsibleFieldClientProps) {
  const fields = (field.fields || []) as ClientField[]
  const expandable = fields.length > 0
  const initCollapsed = field.admin?.initCollapsed === true
  const { customComponents: { Label } = {}, disabled } = useField({ path })
  const { i18n } = useTranslation()
  const { getPreference, setPreference } = usePreferences()
  const { preferencesKey } = useDocumentInfo()
  const [collapsed, setCollapsed] = useState<boolean>()
  const [errorCount, setErrorCount] = useState(0)
  const preferenceId = `collapsible-${path.replaceAll('.', '__')}`

  const remember = useCallback(async (next: boolean) => {
    if (!preferencesKey) return
    const existing = await getPreference<SectionPrefs>(preferencesKey)
    await setPreference(preferencesKey, { ...existing, fields: { ...existing?.fields, [path]: { ...existing?.fields?.[path], collapsed: next } } })
  }, [getPreference, path, preferencesKey, setPreference])

  useEffect(() => {
    const load = async () => {
      if (!expandable) return
      if (!preferencesKey) { setCollapsed(initCollapsed); return }
      const existing = await getPreference<SectionPrefs>(preferencesKey)
      const saved = existing?.fields?.[path]?.collapsed ?? existing?.fields?.[preferenceId]?.collapsed
      setCollapsed(typeof saved === 'boolean' ? saved : initCollapsed)
    }
    void load()
  }, [expandable, getPreference, initCollapsed, path, preferenceId, preferencesKey])

  if (expandable && typeof collapsed !== 'boolean') return null

  const title = Label ?? (typeof field.label === 'string' ? field.label : null)
  const className = ['field-type', 'collapsible-field', 'project-section-card', field.admin?.className].filter(Boolean).join(' ')
  const header = (
    <div className="collapsible__toggle-wrap flex min-h-12 items-center pr-2">
      {expandable ? (
        <AccordionTrigger type="button" className="items-center px-4 py-3 hover:no-underline">
          <span className="flex min-w-0 items-center gap-2">
            {title}
            {errorCount > 0 && <ErrorPill count={errorCount} i18n={i18n} withMessage />}
          </span>
        </AccordionTrigger>
      ) : <div className="flex min-w-0 flex-1 items-center px-4 py-3 text-sm font-medium">{title}</div>}
      <div className="collapsible__actions-wrap flex shrink-0 items-center" />
    </div>
  )

  return <div className={className} id={`field-${preferenceId}`}>
    {expandable && <WatchChildErrors fields={fields} path={path.split('.').slice(0, -1)} setErrorCount={setErrorCount} />}
    {expandable ? (
      <Accordion type="multiple" value={collapsed ? [] : [path]} onValueChange={value => { const next = !value.includes(path); setCollapsed(next); void remember(next) }} className="shadcn-surface">
        <AccordionItem value={path} className="border-0">
          <Card className="gap-0 py-0 shadow-sm">
            {header}
            <AccordionContent className="border-t px-4 pt-4">
              <RenderFields fields={fields} forceRender margins="small" parentIndexPath={indexPath || ''} parentPath={parentPath || ''} parentSchemaPath={parentSchemaPath || ''} permissions={permissions || {}} readOnly={readOnly || disabled} />
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    ) : <Card className="shadcn-surface gap-0 py-0 shadow-sm">{header}</Card>}
  </div>
}
