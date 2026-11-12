import type { LeadInput } from '../../../src/lib/leads'

const prefix = 'Новая заявка с сайта: '
const siteSuffix = /\s*\|\s*Авангард Строй\s*$/

// Названия ипотечных программ. Дублируются из src/lib/mortgage/routes, чтобы не тащить в образ CMS цепочку consent.
const mortgageTitles: Record<string, string> = {
  family: 'Семейная ипотека',
  it: 'IT-ипотека',
  rural: 'Сельская ипотека',
  market: 'Рыночная ипотека',
}

function text(value: unknown) {
  if (typeof value === 'number') return String(value)
  return typeof value === 'string' ? value.trim() : ''
}

// Части через обычный дефис, пустые пропускаются.
function join(...parts: unknown[]) {
  return parts.map(text).filter(Boolean).join(' - ')
}

function mortgageName(id: unknown) {
  return mortgageTitles[text(id)] || ''
}

function pageName(lead: LeadInput, project: string) {
  if (project) return project
  if (lead.sourcePath === '/') return 'Главная'
  return text(lead.meta?.pageTitle).replace(siteSuffix, '') || text(lead.sourcePath)
}

const railChannel: Record<string, string> = { max: 'MAX', telegram: 'Telegram', whatsapp: 'WhatsApp' }

function railDeal(lead: LeadInput, project: string) {
  const channel = text(lead.meta?.channel) || text(lead.formId).replace(/^contact-rail-/, '')
  const kind = channel === 'phone'
    ? 'Заявка из формы обратного звонка'
    : `Заявка из виджета связаться в ${railChannel[channel] || ''}`.trim()
  const page = pageName(lead, project)
  return prefix + (page ? `${kind} на странице ${page}` : kind)
}

// Название сделки: по нему менеджер сразу видит, чего хочет человек.
export function leadTitle(lead: LeadInput, formTitle = '') {
  const meta = lead.meta || {}
  const project = text(meta.projectName) || text(meta.project)
  switch (lead.formId) {
    case 'project-passport': return `Посетитель направил запрос на получение паспорта проекта ${project}`.trim()
    case 'project-configuration': return prefix + join('Расчёт стоимости', project, meta.tier)
    case 'ready-home-offer': return prefix + join('Готовый дом', project, meta.location)
    case 'architect-consultation': return prefix + join('Консультация архитектора', project)
    case 'mortgage-calculator': return join('Консультация по ипотеке', project, mortgageName(meta.program))
    case 'mortgage-consultation': return join('Консультация по ипотеке', project, mortgageName(meta.program))
    case 'factory-tour': return prefix + 'Экскурсия на производство'
    case 'FactoryOpenDayForm': return prefix + `Регистрация на день открытых дверей ${text(meta.date)}`.trim()
    case 'contacts-question':
    case 'header-question': {
      const page = pageName(lead, project)
      return prefix + (page ? `Задать вопрос на странице ${page}` : 'Задать вопрос')
    }
    case 'referral-program': return prefix + 'Регистрация в реферальной программе'
    case 'contact-rail-max':
    case 'contact-rail-telegram':
    case 'contact-rail-whatsapp':
    case 'contact-rail-callback': return railDeal(lead, project)
  }
  return prefix + (text(meta.formHeading) || text(formTitle) || text(lead.formId))
}
