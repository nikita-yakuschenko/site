'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { IconBold, IconItalic, IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react'
import { useTheme } from '@payloadcms/ui'
import type { MailTemplate } from '../../automation/model'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

function HTMLSource({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const host = useRef<HTMLDivElement>(null), view = useRef<EditorView | null>(null), callback = useRef(onChange)
  const permission = useRef(new Compartment()), color = useRef(new Compartment())
  const { theme } = useTheme()
  useEffect(() => { callback.current = onChange }, [onChange])
  useEffect(() => {
    if (!host.current) return
    const instance = new EditorView({ parent: host.current, state: EditorState.create({ doc: value, extensions: [html(), lineNumbers(), highlightActiveLine(), history(), keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]), syntaxHighlighting(defaultHighlightStyle), EditorView.lineWrapping, permission.current.of([EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)]), color.current.of(EditorView.theme({}, { dark: theme === 'dark' })), EditorView.contentAttributes.of({ 'aria-label': 'HTML письма' }), EditorView.theme({ '&': { height: '520px', backgroundColor: 'var(--card)', color: 'var(--foreground)', fontSize: '13px' }, '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-geist-mono), monospace' }, '.cm-gutters': { backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', border: 'none' }, '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--muted), transparent 50%)' }, '&.cm-focused': { outline: 'none' } }), EditorView.updateListener.of(update => { if (update.docChanged) callback.current(update.state.doc.toString()) })] }) })
    view.current = instance
    return () => { instance.destroy(); view.current = null }
    // Document changes and permissions are synchronized below without resetting selection or undo history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { const editor = view.current; if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } }) }, [value])
  useEffect(() => { view.current?.dispatch({ effects: [permission.current.reconfigure([EditorState.readOnly.of(disabled), EditorView.editable.of(!disabled)]), color.current.reconfigure(EditorView.theme({}, { dark: theme === 'dark' }))] }) }, [disabled, theme])
  return <div ref={host} className="overflow-hidden rounded-b-lg" />
}

const policy = `<meta data-email-preview-security http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:; base-uri 'none'; form-action 'none'"><style data-email-preview-security>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.6;margin:0;padding:24px}a{color:#0b1020;text-underline-offset:3px}</style>`
function previewDocument(value: string) {
  return /<head[\s>]/i.test(value) ? value.replace(/<head(?:\s[^>]*)?>/i, '$&' + policy) : `<!doctype html><html><head><meta charset="utf-8">${policy}</head><body>${value}</body></html>`
}
function VisualEmail({ value, disabled, variables, onChange }: { value: string; disabled: boolean; variables: Record<string, string>; onChange: (value: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null), lastEdit = useRef<string | null>(null), previousDisabled = useRef<boolean | null>(null)
  const callback = useRef(onChange)
  useEffect(() => { callback.current = onChange }, [onChange])
  function publish() {
    const doc = frame.current?.contentDocument
    if (!doc || disabled) return
    const clone = doc.documentElement.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-email-variable]').forEach(el => el.replaceWith(doc.createTextNode(`{{${el.getAttribute('data-email-variable')}}}`)))
    clone.querySelectorAll('[data-email-preview-security]').forEach(el => el.remove())
    clone.querySelector('body')?.removeAttribute('contenteditable')
    const next = '<!doctype html>\n' + clone.outerHTML
    lastEdit.current = next
    callback.current(next)
  }
  useEffect(() => {
    if (!frame.current || (lastEdit.current === value && previousDisabled.current === disabled)) return
    lastEdit.current = value; previousDisabled.current = disabled
    frame.current.srcdoc = previewDocument(value)
  }, [value, disabled, variables])
  return <div>
    {!disabled && <div className="flex items-center gap-1 border-b px-3 py-2">{[{ command: 'bold', label: 'Полужирный', Icon: IconBold }, { command: 'italic', label: 'Курсив', Icon: IconItalic }, { command: 'undo', label: 'Отменить изменение', Icon: IconArrowBackUp }, { command: 'redo', label: 'Повторить изменение', Icon: IconArrowForwardUp }].map(({ command, label, Icon }) => <Button key={command} type="button" size="icon" variant="ghost" className="size-8" aria-label={label} onMouseDown={e => e.preventDefault()} onClick={() => { frame.current?.contentDocument?.execCommand(command); publish() }}><Icon /></Button>)}<span className="ml-2 text-xs text-muted-foreground">Текст можно редактировать прямо в письме</span></div>}
    <iframe ref={frame} title="Визуальный редактор письма" sandbox="allow-same-origin" referrerPolicy="no-referrer" className="block h-[520px] w-full rounded-b-lg border-0 bg-white" onLoad={() => {
      const doc = frame.current?.contentDocument
      if (!doc?.body) return
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT), nodes: Text[] = []
      while (walker.nextNode()) { const text = walker.currentNode as Text; if (!['STYLE', 'SCRIPT'].includes(text.parentElement?.tagName || '') && /\{\{\w+\}\}/.test(text.data)) nodes.push(text) }
      for (const node of nodes) {
        const fragment = doc.createDocumentFragment()
        for (const part of node.data.split(/(\{\{\w+\}\})/g)) {
          const token = part.match(/^\{\{(\w+)\}\}$/)
          if (!token) fragment.append(doc.createTextNode(part))
          else { const span = doc.createElement('span'); span.setAttribute('data-email-variable', token[1]); span.contentEditable = 'false'; span.title = part; span.textContent = variables[token[1]] || part; fragment.append(span) }
        }
        node.replaceWith(fragment)
      }
      doc.body.setAttribute('contenteditable', String(!disabled))
      doc.addEventListener('click', event => { if ((event.target as Element)?.closest('a')) event.preventDefault() })
      doc.addEventListener('input', publish)
    }} />
  </div>
}

export type EditableEmail = { key: string; label: string; value: MailTemplate; onChange: (value: MailTemplate) => void }
export function EmailTemplateEditor({ templates, disabled = false, variables = {} }: { templates: EditableEmail[]; disabled?: boolean; variables?: Record<string, string> }) {
  const id = useId(), [selected, setSelected] = useState(templates[0]?.key || ''), [mode, setMode] = useState('visual')
  const current = templates.find(t => t.key === selected) || templates[0]
  if (!current) return null
  return <section className="min-w-0 rounded-lg border bg-card" aria-label="Редактор писем">
    <div className="flex flex-col gap-4 border-b p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Письма</h2><Tabs value={mode} onValueChange={setMode}><TabsList><TabsTrigger value="visual">Визуальный</TabsTrigger><TabsTrigger value="html">HTML</TabsTrigger></TabsList></Tabs></div>
      <div className="flex flex-col gap-2"><Label htmlFor={`${id}-type`}>Тип письма</Label><Select value={current.key} onValueChange={setSelected}><SelectTrigger id={`${id}-type`} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex flex-col gap-2"><Label htmlFor={`${id}-subject`}>Тема письма</Label><Input id={`${id}-subject`} disabled={disabled} value={current.value.subject || ''} onChange={e => current.onChange({ ...current.value, subject: e.target.value })} /></div>
    </div>
    {mode === 'html' ? <HTMLSource key={current.key} value={current.value.html || ''} disabled={disabled} onChange={html => current.onChange({ ...current.value, html })} /> : <VisualEmail key={current.key} value={current.value.html || ''} disabled={disabled} variables={{ name: 'Александр', code: '12345', referral_url: 'https://avgst.ru/?ref=12345', ...variables }} onChange={html => current.onChange({ ...current.value, html })} />}
    <div className="flex flex-col gap-3 border-t p-4"><p className="text-xs text-muted-foreground">Предпросмотр с примером данных участника. Переменные {'{{name}}'} и другие сохраняются при визуальном редактировании.</p><details><summary className="cursor-pointer text-sm text-muted-foreground">Текстовая версия и переменные</summary><div className="mt-3 flex flex-col gap-2"><Label htmlFor={`${id}-text`}>Письмо без HTML</Label><textarea id={`${id}-text`} className="min-h-28 w-full rounded-md border border-input bg-transparent p-3 text-sm" disabled={disabled} value={current.value.text || ''} onChange={e => current.onChange({ ...current.value, text: e.target.value })} /><p className="text-xs text-muted-foreground">{'{{name}}, {{confirm_url}}, {{code}}, {{referral_url}}, {{rules_url}}, {{ttl_hours}}, {{event_title}}, {{event_date}}, {{event_time}}, {{address}}, {{route_url}}, {{phone}}, {{programme}}, {{google_calendar_url}}, {{ics_url}}'}</p></div></details></div>
  </section>
}
