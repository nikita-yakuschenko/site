import type { LeadInput } from '../../../src/lib/leads'
import { leadTitle } from './lead-title'

const programs: Record<string, string> = { family: 'Семейная ипотека', it: 'IT-ипотека', rural: 'Сельская ипотека', market: 'Рыночная ипотека' }
const regions: Record<string, string> = { nn: 'Нижегородская область', msk: 'Московская область' }
const value = (input: unknown) => typeof input === 'string' ? input.trim() : typeof input === 'number' && Number.isFinite(input) ? String(input) : ''
const money = (input: unknown) => typeof input === 'number' && Number.isFinite(input) ? `${Math.round(input).toLocaleString('ru-RU')} ₽` : ''

export function requestDetails(lead: LeadInput) {
  const meta = lead.meta || {}
  const lines: string[] = []
  const add = (label: string, input: unknown) => { const text = value(input); if (text) lines.push(`${label}: ${text}`) }
  add('Обращение', lead.formId === 'mortgage-calculator' || lead.formId === 'mortgage-consultation' ? 'Консультация по ипотеке' : value(meta.formHeading) || leadTitle(lead).replace(/^Новая заявка с сайта: /, ''))
  add('Сообщение клиента', lead.message)
  add('Проект', value(meta.projectName) || value(meta.project))
  add('Комплектация', meta.tier)
  add('Регион строительства', value(meta.construction_region) || regions[value(meta.region)])
  add('Местоположение дома', meta.location)
  add('Программа', programs[value(meta.program)])
  add('Режим расчёта', ({ payment: 'По ежемесячному платежу', budget: 'По стоимости дома' } as Record<string, string>)[value(meta.calc_mode)])
  add('Стоимость дома', money(meta.property_price ?? meta.price))
  add('Первоначальный взнос', money(meta.down_payment))
  add('Сумма кредита', money(meta.loan_amount))
  add('Срок кредита', meta.term_years != null ? `${value(meta.term_years)} лет` : '')
  add('Ежемесячный платёж', money(meta.monthly_payment ?? meta.monthlyPayment))
  add('Количество детей', meta.children_count)
  if (typeof meta.is_combined === 'boolean') add('Комбинированная ипотека', meta.is_combined ? 'Да' : 'Нет')
  if (typeof meta.subsidy_months === 'number' && meta.subsidy_months > 0) add('Срок льготного периода', `${meta.subsidy_months} мес.`)
  if (Array.isArray(meta.parts)) {
    const subsidized = meta.parts.find(part => part && typeof part === 'object' && part.kind === 'subsidized')
    if (subsidized && typeof subsidized.rate === 'number') add('Ставка льготной части', `${Number((subsidized.rate * 100).toFixed(2)).toLocaleString('ru-RU')}%`)
  }
  add('Дата мероприятия', meta.date)
  add('Предложение', meta.promo)
  return lines.join('\n')
}

export function marketingDetails(lead: LeadInput) {
  const meta = lead.meta || {}
  const labels: Record<string, string> = {
    landing_page: 'Страница первого захода',
    gclid: 'Идентификатор клика Google Ads',
  }
  // Остальная атрибуция уже сопоставлена с отдельными полями CRM.
  return ['landing_page', 'gclid'].flatMap(key => {
    let text = value(meta[key])
    if (key === 'landing_page' && text) {
      try { const url = new URL(text); for (const name of [...url.searchParams.keys()]) if (name.startsWith('utm_')) url.searchParams.delete(name); text = url.toString() } catch { /* Сохраняем исходное значение. */ }
    }
    return text ? [`${labels[key]}: ${text}`] : []
  }).join('\n')
}
