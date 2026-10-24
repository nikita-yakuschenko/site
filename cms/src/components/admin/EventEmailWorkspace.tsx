'use client'
import { useField } from '@payloadcms/ui'
export function useEmail(path: string) {
  const subject = useField<string>({ path: `${path}.subject` }), html = useField<string>({ path: `${path}.html` }), text = useField<string>({ path: `${path}.text` })
  return { value: { subject: subject.value || '', html: html.value || '', text: text.value || '' }, onChange: (value: { subject?: string | null; html?: string | null; text?: string | null }) => { if (value.subject !== subject.value) subject.setValue(value.subject || ''); if (value.html !== html.value) html.setValue(value.html || ''); if (value.text !== text.value) text.setValue(value.text || '') }, disabled: html.disabled || html.formProcessing }
}
