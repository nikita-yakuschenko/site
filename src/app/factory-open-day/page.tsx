import type { Metadata } from 'next'
import { Inter, Unbounded } from 'next/font/google'
import { FactoryOpenDayFooter } from '../../components/factory-open-day/footer'
import { OpenDayTheme } from '../../components/factory-open-day/theme'
import { FactoryOpenDayForm } from '../../components/factory-open-day/form'
import { FactoryOpenDayHero } from '../../components/factory-open-day/hero'
import { FactoryOpenDayLocation } from '../../components/factory-open-day/location'
import { FactoryOpenDayProgram } from '../../components/factory-open-day/program'
import { openDayDate } from '../../lib/open-day'
import './open-day.css'

const inter = Inter({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-ags-inter' })
const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['600', '700'], variable: '--font-ags-display' })

export async function generateMetadata(): Promise<Metadata> {
  const date = await openDayDate()
  return {
    title: 'Новый взгляд на загородный дом',
    description: `${date}: производство, выставочные дома, тренды архитектуры и ипотека. Бесплатно, по записи.`,
  }
}

export default async function FactoryOpenDayPage() {
  const date = await openDayDate()
  return <main className={`ags-page ${inter.variable} ${unbounded.variable}`}>
    <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('ags-theme');var d=matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.agsTheme=(p==='light'||p==='dark')?p:(d?'dark':'light')}catch(e){}})()` }} />
    <OpenDayTheme />
    <FactoryOpenDayHero date={date} />
    <FactoryOpenDayProgram />
    <FactoryOpenDayLocation date={date} />
    <FactoryOpenDayForm date={date} />
    <FactoryOpenDayFooter date={date} />
  </main>
}
