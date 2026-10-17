import type { Metadata } from 'next'
import { Inter, Unbounded } from 'next/font/google'
import { FactoryOpenDayFooter } from '../../components/factory-open-day/footer'
import { OpenDayTheme } from '../../components/factory-open-day/theme'
import { FactoryOpenDayForm } from '../../components/factory-open-day/form'
import { FactoryOpenDayHero } from '../../components/factory-open-day/hero'
import { FactoryOpenDayLocation } from '../../components/factory-open-day/location'
import { FactoryOpenDayProgram } from '../../components/factory-open-day/program'
import './open-day.css'

const inter = Inter({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-ags-inter' })
const unbounded = Unbounded({ subsets: ['cyrillic', 'latin'], weight: ['600', '700'], variable: '--font-ags-display' })

export const metadata: Metadata = {
  title: 'День открытых дверей на производстве',
  description: '12 сентября производство «Авангард Строй» открывает двери. Экскурсия по цехам, дом изнутри и вопросы архитектору. Бесплатно, по записи.',
}

export default function FactoryOpenDayPage() {
  return <main className={`ags-page ${inter.variable} ${unbounded.variable}`}>
    <OpenDayTheme />
    <FactoryOpenDayHero />
    <FactoryOpenDayProgram />
    <FactoryOpenDayLocation />
    <FactoryOpenDayForm />
    <FactoryOpenDayFooter />
  </main>
}
