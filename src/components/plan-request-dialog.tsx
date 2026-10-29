'use client'

import Image from 'next/image'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { IconArrowLeft, IconArrowRight, IconCheck, IconFileText, IconHomeEdit, IconPhoto, IconPlus, IconAdjustments, IconTrash, IconUpload, IconPhone, IconBrandWhatsapp } from '@tabler/icons-react'
import { DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { PhoneInput } from './phone-input'
import { copy } from '../lib/copy'
import { planChanges, planModes, roomKinds, emptyRequirements, requirementsDetails, planDetailsSchema, planContactSchema, submitPlanRequestDemo, validateSketchFile, PLAN_REQUEST_DEMO_RECEIPT, type PlanRequestContext, type PlanRequestMode, type RequirementsDraft, type RoomWish, type SketchMetadata, type PlanDetails } from '../lib/plan-request'

const icons = [IconHomeEdit, IconAdjustments, IconPhoto]
const toggle = (list: string[], item: string) => list.includes(item) ? list.filter(value => value !== item) : [...list, item]
type ContactDraft = { name: string; phone: string; preferredContact: 'call' | 'whatsapp' | 'telegram' | 'max'; comment: string; consent: boolean }
const blankContact = (): ContactDraft => ({ name: '', phone: '', preferredContact: 'call', comment: '', consent: false })

function Choices({ legend, values, value, onChange }: { legend: string; values: readonly (readonly [string, string, ReactNode?])[]; value: string; onChange: (value: string) => void }) {
  const name = useId()
  return <fieldset className="plan-request__choices"><legend>{legend}</legend><div>{values.map(([key, label, icon]) => <label key={key}><input type="radio" name={name} value={key} checked={value === key} onChange={() => onChange(key)} /><span>{icon}{label}</span></label>)}</div></fieldset>
}
function TextArea({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="plan-request__field" htmlFor={id}>{label}<textarea id={id} className="ym-hide-content ym-disable-keys" maxLength={500} rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /><span className="plan-request__count">{value.length}/500</span></label>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="plan-request__field"><span>{label}</span>{children}</div> }

export function PlanRequestDialog({ context, open, onReset }: { context: PlanRequestContext; open: boolean; onReset: () => void }) {
  const prefix = useId()
  const content = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const previewURL = useRef<string | null>(null)
  const fileSequence = useRef(0)
  const submitLock = useRef(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [mode, setMode] = useState<PlanRequestMode>('modify_current')
  const [changes, setChanges] = useState<string[]>([])
  const [modifyComment, setModifyComment] = useState('')
  const [requirements, setRequirements] = useState<RequirementsDraft>(emptyRequirements)
  const [sketch, setSketch] = useState<{ file: SketchMetadata | null; link: string; comment: string; preview: string }>({ file: null, link: '', comment: '', preview: '' })
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')
  const [contact, setContact] = useState<ContactDraft>(blankContact)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle')

  useEffect(() => () => { fileSequence.current++; if (previewURL.current) URL.revokeObjectURL(previewURL.current) }, [])
  // visualViewport follows the keyboard as well as the dynamic browser chrome.
  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    const measure = () => {
      const node = content.current
      if (!node || window.innerWidth >= 768) return
      node.style.setProperty('--plan-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      node.style.setProperty('--plan-viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }
    measure(); viewport?.addEventListener('resize', measure); viewport?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    return () => { viewport?.removeEventListener('resize', measure); viewport?.removeEventListener('scroll', measure); window.removeEventListener('resize', measure) }
  }, [open])

  const patchRequirements = (patch: Partial<RequirementsDraft>) => setRequirements(value => ({ ...value, ...patch }))
  const patchContact = (patch: Partial<ContactDraft>) => { setContact(value => ({ ...value, ...patch })); setErrors({}) }
  function navigate(next: 1 | 2 | 3, preserveErrors = false) {
    if (!preserveErrors) setErrors({})
    setStep(next)
    requestAnimationFrame(() => { body.current?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }) })
  }
  function details(): unknown {
    if (mode === 'modify_current') return { mode, wishes: { changes, comment: modifyComment } }
    if (mode === 'custom_requirements') return requirementsDetails(requirements)
    return { mode, wishes: { file: sketch.file, link: sketch.link, comment: sketch.comment } }
  }
  function validateDetails(): PlanDetails | null {
    const result = planDetailsSchema.safeParse(details())
    if (!result.success) { setErrors({ details: result.error.issues[0]?.message ?? 'Проверьте пожелания', detailField: result.error.issues[0]?.path.join('.') ?? '' }); return null }
    return result.data
  }
  async function selectFile(file: File | undefined) {
    if (!file) return
    const sequence = ++fileSequence.current
    setFileError(''); setFileBusy(true)
    try {
      const metadata = await validateSketchFile(file)
      if (sequence !== fileSequence.current) return
      if (previewURL.current) URL.revokeObjectURL(previewURL.current)
      previewURL.current = metadata.type.startsWith('image/') ? URL.createObjectURL(file) : null
      setSketch(value => ({ ...value, file: metadata, preview: previewURL.current ?? '' }))
      setErrors({})
    } catch (error) { if (sequence === fileSequence.current) setFileError(error instanceof Error ? error.message : 'Не удалось прочитать файл') }
    finally { if (sequence === fileSequence.current) setFileBusy(false) }
  }
  function removeFile() {
    fileSequence.current++; setFileBusy(false); setFileError('')
    if (previewURL.current) URL.revokeObjectURL(previewURL.current)
    previewURL.current = null
    setSketch(value => ({ ...value, file: null, preview: '' }))
  }
  function reset() {
    onReset()
    removeFile(); setMode('modify_current'); setChanges([]); setModifyComment(''); setRequirements(emptyRequirements()); setSketch({ file: null, link: '', comment: '', preview: '' }); setContact(blankContact()); setStatus('idle'); navigate(1)
  }
  async function submit() {
    if (submitLock.current) return
    const chosenDetails = validateDetails()
    if (!chosenDetails) { navigate(2, true); return }
    const parsed = planContactSchema.safeParse(contact)
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])))
      requestAnimationFrame(() => content.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.scrollIntoView({ block: 'center', behavior: 'instant' }))
      return
    }
    submitLock.current = true; setStatus('sending'); setErrors({})
    try {
      await submitPlanRequestDemo({ version: 1, context, details: chosenDetails, contact })
      setStatus('success')
      requestAnimationFrame(() => { body.current?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }) })
    } catch { setErrors({ submit: 'Не удалось проверить данные. Попробуйте ещё раз.' }); setStatus('idle') }
    finally { submitLock.current = false }
  }
  const title = status === 'success' ? 'Пожелания проверены' : step === 1 ? 'Планировка под вас' : step === 3 ? 'Мы изучим ваши пожелания' : mode === 'modify_current' ? 'Что хотите изменить?' : mode === 'custom_requirements' ? 'Расскажите о вашем доме' : 'Покажите свой эскиз'
  const subtitle = status === 'success' ? PLAN_REQUEST_DEMO_RECEIPT : step === 1 ? 'Какую планировку вы хотите?' : step === 3 ? 'Оставьте контакты для обсуждения.' : mode === 'modify_current' ? 'Выберите изменения.' : mode === 'custom_requirements' ? 'Укажите важные для вас параметры.' : 'Добавьте файл, ссылку или описание.'
  return <DialogContent ref={content} className="plan-request-dialog" overlayClassName="plan-request-overlay" closeLabel="Закрыть бриф" onOpenAutoFocus={event => { event.preventDefault(); content.current?.focus({ preventScroll: true }) }} onPointerDownOutside={event => event.preventDefault()}>
    <form className="plan-request" noValidate autoComplete="off" onSubmit={event => { event.preventDefault(); if (step === 3) void submit(); else if (step === 1 || validateDetails()) navigate(step === 1 ? 2 : 3) }}>
      <header className="plan-request__header">
        <DialogTitle asChild><h2 ref={heading} tabIndex={-1}>{title}</h2></DialogTitle>
        {status !== 'success' && <div className="plan-request__progress"><span aria-live="polite">{step} из 3</span><progress value={step} max={3} aria-label="Этап заполнения" /></div>}
        <DialogDescription className="plan-request__description">{subtitle}</DialogDescription>
      </header>
      <div className="plan-request__body" ref={body}>
        {status === 'success' ? <div className="plan-request__success"><IconCheck size={40} aria-hidden="true" /><p>Это локальная проверка формы. Контакты и файлы не переданы менеджеру и не сохранены на сервере.</p></div> : <>
          {step === 1 && <fieldset className="plan-request__modes"><legend className="visually-hidden">Как вам удобнее рассказать о планировке?</legend>{planModes.map((item, index) => {
            const Icon = icons[index]!
            return <label key={item.id}><input type="radio" name="plan-mode" checked={mode === item.id} onChange={() => setMode(item.id)} /><Icon size={28} stroke={1.5} aria-hidden="true" /><span><strong>{item.title}</strong><span>{item.description}</span></span><span className="plan-request__radio" aria-hidden="true" /></label>
          })}</fieldset>}
          {step === 2 && mode === 'modify_current' && <>
            <p className="plan-request__context">{context.projectName}{context.variant && ` · ${context.variant.label}`}{context.floor && ` · ${context.floor.label}`}</p>
            <fieldset className="plan-request__checks"><legend className="visually-hidden">Пожелания к текущей планировке</legend>{planChanges.map(change => <label key={change}><Checkbox checked={changes.includes(change)} onCheckedChange={() => setChanges(value => toggle(value, change))} /><span>{change}</span></label>)}</fieldset>
            <TextArea id={`${prefix}-modify`} label="Расскажите подробнее" value={modifyComment} onChange={setModifyComment} placeholder="Например, кухню-гостиную около 30 м² и отдельный кабинет" />
          </>}
          {step === 2 && mode === 'custom_requirements' && <>
            <Choices legend="Желаемая площадь дома" value={requirements.area} onChange={area => patchRequirements({ area })} values={[["unknown", "Не определился"], ["up-to-80", "До 80 м²"], ["80-120", "80–120 м²"], ["120-180", "120–180 м²"], ["180-plus", "Более 180 м²"], ["custom", "Своё значение"]]} />
            {requirements.area === 'custom' && <label className="plan-request__field" htmlFor={`${prefix}-area`}>Площадь или диапазон, м²<input id={`${prefix}-area`} aria-invalid={errors.detailField === 'wishes.customArea'} aria-describedby={errors.detailField === 'wishes.customArea' ? `${prefix}-details-error` : undefined} value={requirements.customArea} maxLength={40} placeholder="Например, 100–140" onChange={event => patchRequirements({ customArea: event.target.value })} /></label>}
            <div className="plan-request__columns"><Choices legend="Количество спален" value={requirements.bedrooms} onChange={bedrooms => patchRequirements({ bedrooms })} values={[["unknown", "Не знаю"], ["1", "1"], ["2", "2"], ["3", "3"], ["4+", "4+"]]} /><Choices legend="Количество санузлов" value={requirements.bathrooms} onChange={bathrooms => patchRequirements({ bathrooms })} values={[["unknown", "Не знаю"], ["1", "1"], ["2", "2"], ["3+", "3+"]]} /></div>
            <Choices legend="Этажность" value={requirements.floors} onChange={floors => patchRequirements({ floors })} values={[["unknown", "Не принципиально"], ["1", "Один этаж"], ["2", "Два этажа"]]} />
            <fieldset className="plan-request__checks plan-request__checks--grid"><legend>Дополнительные помещения</legend>{roomKinds.slice(3).map(room => <label key={room.id}><Checkbox checked={requirements.extras.includes(room.id)} onCheckedChange={() => patchRequirements({ extras: toggle(requirements.extras, room.id) })} /><span>{room.name}</span></label>)}</fieldset>
            <p className="plan-request__hint">Террасу и технические помещения учитываем отдельно от жилых комнат. Площади здесь не суммируются.</p>
            <details className="plan-request__room-details"><summary>Указать желаемые площади помещений</summary><div className="plan-request__rooms">{requirements.rooms.map((room, index) => <div className="plan-request__room" key={room.id}>
              <Field label={`Помещение ${index + 1}`}><Select value={room.kind} onValueChange={kind => patchRequirements({ rooms: requirements.rooms.map(row => row.id === room.id ? { ...row, kind: kind as RoomWish['kind'], name: kind === 'other' ? '' : roomKinds.find(item => item.id === kind)!.name } : row) })}><SelectTrigger aria-label={`Тип помещения ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent>{roomKinds.map(kind => <SelectItem key={kind.id} value={kind.id}>{kind.id === 'other' ? 'Своё название' : kind.name}</SelectItem>)}</SelectContent></Select></Field>
              <label className="plan-request__field" htmlFor={`${prefix}-room-${room.id}`}>Площадь от, м²<input id={`${prefix}-room-${room.id}`} type="number" inputMode="decimal" min="0.1" max="2000" step="0.1" value={room.area} onChange={event => patchRequirements({ rooms: requirements.rooms.map(row => row.id === room.id ? { ...row, area: event.target.value } : row) })} /></label>
              <button type="button" className="plan-request__icon" aria-label={`Удалить помещение ${index + 1}`} onClick={() => patchRequirements({ rooms: requirements.rooms.filter(row => row.id !== room.id) })}><IconTrash size={20} /></button>
              {room.kind === 'other' && <><label className="plan-request__field" htmlFor={`${prefix}-room-name-${room.id}`}>Название помещения<input id={`${prefix}-room-name-${room.id}`} maxLength={80} value={room.name} onChange={event => patchRequirements({ rooms: requirements.rooms.map(row => row.id === room.id ? { ...row, name: event.target.value } : row) })} /></label><Field label="Тип площади"><Select value={room.category} onValueChange={category => patchRequirements({ rooms: requirements.rooms.map(row => row.id === room.id ? { ...row, category: category as RoomWish['category'] } : row) })}><SelectTrigger aria-label={`Тип площади помещения ${index + 1}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="heated">Внутри дома</SelectItem><SelectItem value="engineering">Техническая</SelectItem><SelectItem value="outdoor">Вне тёплого контура</SelectItem></SelectContent></Select></Field></>}
            </div>)}</div><button type="button" className="plan-request__add" disabled={requirements.rooms.length >= 12} onClick={() => patchRequirements({ rooms: [...requirements.rooms, { id: crypto.randomUUID(), kind: 'kitchen', name: 'Кухня-гостиная', area: '', category: 'heated' }] })}><IconPlus size={18} />Добавить помещение</button></details>
            <TextArea id={`${prefix}-requirements`} label="Что ещё для вас важно?" value={requirements.comment} onChange={comment => patchRequirements({ comment })} placeholder="Например, много света, хозяйская спальня, выход на террасу из гостиной" />
          </>}
          {step === 2 && mode === 'own_sketch' && <>
            <div className="plan-request__upload" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (event.dataTransfer.files.length > 1) setFileError('Выберите один файл'); else void selectFile(event.dataTransfer.files[0]) }}>
              {sketch.file ? <><div className="plan-request__file-preview">{sketch.preview ? <img src={sketch.preview} alt="Предпросмотр вашего эскиза" onError={() => { removeFile(); setFileError('Изображение не удалось открыть. Выберите другой файл.') }} /> : <IconFileText size={40} aria-hidden="true" />}</div><strong>{sketch.file.name}</strong><span>{sketch.file.size < 1024 * 1024 ? `${Math.max(1, Math.round(sketch.file.size / 1024))} КБ` : `${(sketch.file.size / 1024 / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} МБ`}</span><button type="button" className="plan-request__add" onClick={removeFile}><IconTrash size={18} />Удалить файл</button></> : <><IconUpload size={32} aria-hidden="true" /><strong>Эскиз, план или фотография рисунка</strong><span>Перетащите файл сюда или выберите на устройстве</span></>}
              <label className="plan-request__file-button">{fileBusy ? 'Проверяем файл…' : sketch.file ? 'Заменить файл' : 'Выбрать файл'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Файл эскиза" aria-invalid={Boolean(fileError)} aria-describedby={fileError ? `${prefix}-file-error` : undefined} disabled={fileBusy} onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = '' }} /></label>
              <small>JPG, PNG, WebP или PDF, до 10 МБ. Файл остаётся на устройстве.</small>
            </div>
            {fileError && <p id={`${prefix}-file-error`} className="plan-request__error" role="alert">{fileError}</p>}
            <label className="plan-request__field" htmlFor={`${prefix}-link`}>Или ссылка на планировку<input id={`${prefix}-link`} aria-invalid={errors.detailField === 'wishes.link'} aria-describedby={errors.detailField === 'wishes.link' ? `${prefix}-details-error` : undefined} type="url" inputMode="url" maxLength={2000} value={sketch.link} placeholder="https://" onChange={event => { setSketch(value => ({ ...value, link: event.target.value })); setErrors({}) }} /></label>
            <TextArea id={`${prefix}-sketch`} label="Что нравится и что хотелось бы изменить?" value={sketch.comment} onChange={comment => { setSketch(value => ({ ...value, comment })); setErrors({}) }} />
          </>}
          {step === 3 && <>
            <div className="plan-request__columns"><label className="plan-request__field" htmlFor={`${prefix}-name`}>Имя *<input id={`${prefix}-name`} aria-label="Имя *" name="name" autoComplete="name" className="ym-hide-content ym-disable-keys" value={contact.name} maxLength={120} onChange={event => patchContact({ name: event.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${prefix}-name-error` : undefined} />{errors.name && <span className="plan-request__error" id={`${prefix}-name-error`}>{errors.name}</span>}</label>
            <label className="plan-request__field" htmlFor={`${prefix}-phone`}>Телефон *<PhoneInput id={`${prefix}-phone`} aria-label="Телефон *" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="ym-hide-content ym-disable-keys" value={contact.phone} onValueChange={phone => patchContact({ phone })} placeholder={copy.phonePlaceholder} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? `${prefix}-phone-error` : undefined} />{errors.phone && <span className="plan-request__error" id={`${prefix}-phone-error`}>{errors.phone}</span>}</label></div>
            <Choices legend="Как удобнее связаться?" values={[["call", "Звонок", <IconPhone key="phone" size={20} aria-hidden="true" />], ["whatsapp", "WhatsApp", <IconBrandWhatsapp key="whatsapp" size={20} color="#25D366" aria-hidden="true" />], ["telegram", "Telegram", <Image key="telegram" src="/social/tg_original.svg" width={20} height={20} alt="" />], ["max", "MAX", <Image key="max" src="/social/max_original.svg" width={20} height={20} alt="" />]]} value={contact.preferredContact} onChange={preferredContact => patchContact({ preferredContact: preferredContact as ContactDraft['preferredContact'] })} />
            <TextArea id={`${prefix}-contact-comment`} label="Дополнительный комментарий" value={contact.comment} onChange={comment => patchContact({ comment })} placeholder="Удобное время связи или другие детали" />
            <label className="plan-request__consent"><Checkbox checked={contact.consent} onCheckedChange={checked => patchContact({ consent: checked === true })} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? `${prefix}-consent-error` : undefined} /><span>{copy.consentPrefix}<a href={copy.personalDataHref} target="_blank" rel="noreferrer">{copy.consentLinkLabel}</a> *</span></label>
            {errors.consent && <p className="plan-request__error" id={`${prefix}-consent-error`}>{errors.consent}</p>}
          </>}
          {step === 3 && (errors.name || errors.phone || errors.consent) && <p className="visually-hidden" role="alert">{[errors.name, errors.phone, errors.consent].filter(Boolean).join('. ')}</p>}
          {Object.entries(errors).filter(([key]) => !['name', 'phone', 'consent', 'detailField'].includes(key)).map(([key, error]) => <p key={key} id={key === 'details' ? `${prefix}-details-error` : undefined} className="plan-request__error" role="alert">{error}</p>)}
        </>}
      </div>
      <footer className="plan-request__footer">
        {status === 'success' ? <><button type="button" className="plan-request__back" onClick={reset}>Новый бриф</button><DialogClose asChild><button type="button" className="btn btn-yellow">Готово</button></DialogClose></> : <>
          {step > 1 ? <button type="button" className="plan-request__back" disabled={status === 'sending'} onClick={() => navigate(step === 3 ? 2 : 1)}><IconArrowLeft size={18} />Назад</button> : null}
          <button type="submit" className="btn btn-yellow" disabled={status === 'sending' || fileBusy} aria-busy={status === 'sending'}>{status === 'sending' ? 'Проверяем…' : step === 3 ? 'Отправить пожелания' : 'Продолжить'}{step !== 3 && <IconArrowRight size={18} aria-hidden="true" />}</button>
        </>}
      </footer>
    </form>
  </DialogContent>
}
