'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { IconBrandWhatsapp, IconChevronLeft, IconPhoneCall } from '@tabler/icons-react'
import { FOOTER_SOCIALS } from '../lib/site'
import { fallbackMessengerLinks, type MessengerLinks } from '../lib/messengers'
import { LeadDialog } from './lead-dialog'
import './contact-rail.css'

type MessengerId = 'max' | 'telegram' | 'whatsapp'
type RailDialog = MessengerId | 'callback'

function channels(links: MessengerLinks) {
  return [
    { id: 'max' as const, label: 'MAX', href: links.max },
    { id: 'telegram' as const, label: 'Telegram', href: links.telegram },
    { id: 'whatsapp' as const, label: 'WhatsApp', href: links.whatsapp },
  ].filter(item => item.href)
}

/** Shared contact actions; the footer remains the source of messenger assets. */
export function ContactRail({ links = fallbackMessengerLinks() }: { links?: MessengerLinks }) {
  const messengers = channels(links)
  const pathname = usePathname()
  const [dialog, setDialog] = useState<RailDialog | null>(null)
  const [belowHero, setBelowHero] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [framed, setFramed] = useState(false)
  const [attention, setAttention] = useState(false)
  const [contactsVisible, setContactsVisible] = useState(false)
  const railRef = useRef<HTMLElement>(null)
  const projectPage = /^\/catalog\/[^/]+\/?$/.test(pathname)
  const homePage = pathname === '/'
  const collapsed = belowHero && !expanded
  const stopAttention = () => setAttention(false)
  useEffect(() => {
    if (collapsed || dialog || contactsVisible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    let finish = 0
    const shine = () => {
      const rail = railRef.current
      if (!document.hidden && rail && !rail.matches(':hover, :focus-within')) {
        setAttention(true)
        finish = window.setTimeout(() => setAttention(false), 2200)
      }
      timer = window.setTimeout(shine, 8000)
    }
    timer = window.setTimeout(shine, 1000)
    return () => { window.clearTimeout(timer); window.clearTimeout(finish); setAttention(false) }
  }, [collapsed, dialog, contactsVisible])
  useEffect(() => {
    const targets = new Map<Element, boolean>()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => targets.set(entry.target, entry.isIntersecting))
      setContactsVisible([...targets.values()].some(Boolean))
    })
    const register = () => document.querySelectorAll('#contacts, [data-cms-block="contactsSection"], footer').forEach(element => {
      if (!targets.has(element)) { targets.set(element, false); observer.observe(element) }
    })
    register()
    // CMS sections can arrive after the initial streamed shell.
    const mutations = new MutationObserver(register)
    mutations.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect(); mutations.disconnect() }
  }, [pathname])
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const measure = () => {
      const buttons = rail.querySelectorAll<HTMLElement>('.contact-rail__action')
      const first = rail.classList.contains('contact-rail--expanded') ? rail.querySelector<HTMLElement>('.contact-rail__toggle') : buttons[0]
      const last = buttons[buttons.length - 1]
      if (!first || !last) return
      const bounds = rail.getBoundingClientRect()
      const w = bounds.width, h = bounds.height + 40
      if (w < 40 || (rail.classList.contains('contact-rail--compact') && !rail.classList.contains('contact-rail--expanded'))) return
      const r = w < 40 ? w / 2 : first.offsetLeft + first.offsetWidth / 2
      const topCenter = Math.min(first.offsetTop + first.offsetHeight / 2 + 20, h / 2)
      const bottomCenter = Math.max(topCenter, Math.min(last.offsetTop + last.offsetHeight / 2 + 20, h - 20 - r))
      const top = topCenter - r, bottom = bottomCenter + r
      // Complete quarter-ellipse joins followed by 4px of vertical run.
      // Their endpoints stay inside the viewBox, so the viewport cannot cut
      // off the part where the curve becomes vertical.
      const k = .55228475
      const shoulder = r + (w - r) * k
      const d = `M${w} 0V4C${w} ${4 + (top - 4) * k} ${shoulder} ${top} ${r} ${top}A${r} ${r} 0 0 0 0 ${topCenter}V${bottomCenter}A${r} ${r} 0 0 0 ${r} ${bottom}C${shoulder} ${bottom} ${w} ${h - 4 - (h - 4 - bottom) * k} ${w} ${h - 4}V${h}Z`
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${d}" fill="white"/></svg>`
      rail.style.setProperty('--contact-rail-mask', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(rail)
    rail.querySelectorAll('.contact-rail__action').forEach(button => observer.observe(button))
    rail.addEventListener('transitionend', measure)
    return () => { observer.disconnect(); rail.removeEventListener('transitionend', measure) }
  }, [])
  useEffect(() => {
    let frame = 0
    const update = () => {
      const hero = document.querySelector(pathname === '/' ? '.hero' : '.project-hero')
      setBelowHero(Boolean(window.matchMedia('(max-width: 767px)').matches && hero && hero.getBoundingClientRect().bottom <= 180))
      setExpanded(false)
    }
    const scroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', scroll)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll) }
  }, [pathname])
  useEffect(() => {
    if (!expanded) {
      setFramed(false)
      return
    }
    const rail = railRef.current
    if (!rail || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFramed(true)
      return
    }
    let done = false
    const finish = () => { if (!done) { done = true; setFramed(true) } }
    const onEnd = (event: TransitionEvent) => {
      if (event.target !== rail || (event.propertyName !== 'width' && event.propertyName !== 'height')) return
      finish()
    }
    rail.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(finish, 360)
    return () => { rail.removeEventListener('transitionend', onEnd); window.clearTimeout(timer) }
  }, [expanded])
  useEffect(() => {
    if (!expanded) return
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !railRef.current?.contains(event.target)) setExpanded(false) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key) }
  }, [expanded])
  return <>
    <nav ref={railRef} inert={contactsVisible} aria-hidden={contactsVisible} onPointerEnter={stopAttention} onPointerDown={stopAttention} onFocusCapture={stopAttention} className={`contact-rail${projectPage ? ' contact-rail--project' : ''}${homePage ? ' contact-rail--home' : ''}${belowHero ? ' contact-rail--compact' : ''}${expanded ? ' contact-rail--expanded' : ''}${framed ? ' contact-rail--framed' : ''}${attention ? ' contact-rail--attention' : ''}${contactsVisible ? ' contact-rail--hidden' : ''}`} aria-label="Связаться с нами">
      <button type="button" className="contact-rail__toggle" aria-hidden={!belowHero} tabIndex={belowHero ? 0 : -1} aria-label={expanded ? 'Свернуть контакты' : 'Открыть контакты'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        <IconChevronLeft size={18} aria-hidden="true" />
      </button>
      {messengers.filter(item => item.id !== 'whatsapp').map(item => {
        const social = FOOTER_SOCIALS.find(entry => entry.id === item.id)!
        return <button key={item.id} type="button" className="contact-rail__action" tabIndex={collapsed ? -1 : 0} aria-hidden={collapsed} aria-label={item.label} onClick={() => setDialog(item.id)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="contact-rail__logo contact-rail__logo--light" src={item.id === 'telegram' ? '/social/tg_rail_light.svg' : social.light} width={24} height={24} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="contact-rail__logo contact-rail__logo--original" src={social.original} width={24} height={24} alt="" />
          <span className="contact-rail__label">{item.label}</span>
        </button>
      })}
      {messengers.some(item => item.id === 'whatsapp') ? <button type="button" className="contact-rail__action contact-rail__action--whatsapp" tabIndex={collapsed ? -1 : 0} aria-hidden={collapsed} aria-label="WhatsApp" onClick={() => setDialog('whatsapp')}>
        <IconBrandWhatsapp size={24} stroke={1.7} aria-hidden="true" /><span className="contact-rail__label">WhatsApp</span>
      </button> : null}
      <button className="contact-rail__action contact-rail__action--callback" type="button" tabIndex={collapsed ? -1 : 0} aria-hidden={collapsed} aria-label="Перезвоните мне" onClick={() => setDialog('callback')}>
        <IconPhoneCall size={24} stroke={1.7} aria-hidden="true" /><span className="contact-rail__label">Перезвоните мне</span>
      </button>
    </nav>
    {dialog ? <RailLead dialog={dialog} pageId={pathname} links={links} onClose={() => setDialog(null)} /> : null}
  </>
}

function RailLead({ dialog, pageId, links, onClose }: { dialog: RailDialog; pageId: string; links: MessengerLinks; onClose: () => void }) {
  if (dialog === 'callback') {
    return <LeadDialog heading="Перезвоните мне" body="Оставьте номер телефона — мы перезвоним." submitLabel="Жду звонка" successText="Заявка принята. Перезвоним вам." formId="contact-rail-callback" pageId={pageId} meta={{ contactSource: 'contact-rail', channel: 'phone' }} onClose={onClose} />
  }
  const messenger = channels(links).find(item => item.id === dialog)!
  const successText = 'Заявка принята. Напишите нам первыми — так мы сразу поймём, что это вы.'
  return <LeadDialog heading={`Свяжемся с вами в ${messenger.label}`} body="Оставьте номер телефона. После заявки откроем диалог, напишите туда первыми." submitLabel="Отправить" successText={successText} actionHref={messenger.href} actionLabel={`Написать в ${messenger.label}`} actionChannel={messenger.id} formId={`contact-rail-${messenger.id}`} pageId={pageId} meta={{ contactSource: 'contact-rail', channel: messenger.id }} onClose={onClose} />
}
