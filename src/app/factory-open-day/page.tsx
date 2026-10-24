import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { FactoryOpenDayFooter } from '../../components/factory-open-day/footer'
import { OpenDayTheme } from '../../components/factory-open-day/theme'
import { FactoryOpenDayForm } from '../../components/factory-open-day/form'
import { FactoryOpenDayHero } from '../../components/factory-open-day/hero'
import { FactoryOpenDayLocation } from '../../components/factory-open-day/location'
import { FactoryOpenDayProgram } from '../../components/factory-open-day/program'
import { openDayDate, openDayEvent } from '../../lib/open-day'
import './open-day.css'

const inter = localFont({ src: '../../../public/fonts/inter/Inter-Variable.ttf', weight: '400 700', variable: '--font-ags-inter', display: 'swap', preload: false })
const unbounded = localFont({ src: '../../../public/fonts/unbounded/Unbounded-Variable.ttf', weight: '600 700', variable: '--font-ags-display', display: 'swap', preload: false })

export async function generateMetadata(): Promise<Metadata> {
  const date = await openDayDate()
  return {
    title: 'Новый взгляд на загородный дом',
    description: `${date}: производство, выставочные дома, тренды архитектуры и ипотека. Бесплатно, по записи.`,
  }
}

export default async function FactoryOpenDayPage() {
  const [date, event] = await Promise.all([openDayDate(), openDayEvent()])
  const minutes = event ? Math.max(0, Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000)) : 0
  const durationLabel = minutes ? [Math.floor(minutes / 60) ? new Intl.NumberFormat('ru-RU', { style: 'unit', unit: 'hour', unitDisplay: 'long' }).format(Math.floor(minutes / 60)) : '', minutes % 60 ? new Intl.NumberFormat('ru-RU', { style: 'unit', unit: 'minute', unitDisplay: 'long' }).format(minutes % 60) : ''].filter(Boolean).join(' ') : undefined
  return <main className={`ags-page ${inter.variable} ${unbounded.variable}`}>
    <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('ags-theme');var d=matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.agsTheme=(p==='light'||p==='dark')?p:(d?'dark':'light')}catch(e){}})()` }} />
    <OpenDayTheme />
    <FactoryOpenDayHero data-cms-content-connected date={date} />
    <FactoryOpenDayProgram data-cms-content-connected programme={event?.programme} durationLabel={durationLabel} />
    <FactoryOpenDayLocation data-cms-content-connected date={date} event={event} />
    <FactoryOpenDayForm data-cms-content-connected date={date} registrationEnabled={!event || (event.registrationEnabled && event.status === 'published' && new Date(event.startsAt).getTime() > Date.now())} />
    <FactoryOpenDayFooter data-cms-content-connected date={date} phone={event?.phone} address={event?.address} />
  </main>
}
