import { createHash } from 'node:crypto'
import type { Metadata } from 'next'
import { findCMSContentRecord, type ContentRecord } from './cms/react-content'

export const OPEN_DAY_ROUTE = '/factory-open-day'

export function openDayShareContent(records: readonly ContentRecord[]) {
  const parts = findCMSContentRecord(records, 'FactoryOpenDayHero', OPEN_DAY_ROUTE)?.parts || []
  const heading = parts.filter(part => part.title?.startsWith('Заголовок:')).map(part => part.text?.trim()).filter(Boolean).join(' ')
  const photo = parts.find(part => part.originalImage?.endsWith('/factory-open-day/hero.webp'))?.image
  return {
    heading: heading || 'Новый взгляд на загородный дом',
    image: photo || 'https://avgst.ru/factory-open-day/hero.webp',
  }
}

export function openDayMetadata(date: string, records: readonly ContentRecord[]): Metadata {
  const content = openDayShareContent(records)
  const title = `${content.heading} — ${date}`
  const description = `${date} — день открытых дверей «Авангард Строй» в Нижнем Новгороде. Производство, выставочные дома, архитектура и ипотека. Бесплатно, по записи.`
  const revision = createHash('sha256').update(JSON.stringify({ date, ...content })).digest('hex').slice(0, 16)
  const image = { url: `https://avgst.ru${OPEN_DAY_ROUTE}/og?v=${revision}`, width: 1200, height: 630, alt: `${title}. День открытых дверей «Авангард Строй»` }
  return {
    title,
    description,
    alternates: { canonical: `https://avgst.ru${OPEN_DAY_ROUTE}` },
    openGraph: { title, description, url: `https://avgst.ru${OPEN_DAY_ROUTE}`, siteName: 'Авангард Строй', locale: 'ru_RU', type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}
