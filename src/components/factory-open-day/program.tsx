'use client'
import { CMSContentBlock } from '../cms-content'
import { OpenDayRules } from './rules'

const steps = [
  ['01', '10 минут', 'Встреча гостей', 'Знакомство и инструктаж.'],
  ['02', '45 минут', 'Экскурсия по цехам', 'От отбора материалов до готового дома.'],
  ['03', '15 минут', 'Трансфер на выставочную площадку', 'Переезд между площадками.'],
  ['04', '30 минут', 'Почувствуйте себя как дома', 'Почувствуйте реальные размеры и сравните планировочные решения.'],
  ['05', '15 минут', 'Согревающий глинтвейн и приятная беседа', 'Неформальное общение с экспертами.'],
  ['06', '20–25 минут', 'Диалог с архитектором: тренды загородной архитектуры', 'Разберём архитектурные тренды, цветовые решения, актуальные планировки и проекты.'],
  ['07', '15 минут', 'Ипотека на дом в 2027 году: условия и цифры', 'Что изменилось на рынке ИЖС: разберём ипотечные условия банков и посчитаем средний ежемесячный платёж.'],
  ['08', '15 минут', 'Открытый диалог', 'Ответы на любые вопросы.'],
  ['09', '15 минут', 'Трансфер на производственную площадку', 'При необходимости.'],
]

export function FactoryOpenDayProgram({ programme }: { programme?: { time?: string; title: string; description?: string }[] | null }) {
  const shown = programme?.length ? programme.map((step, index) => [String(index + 1).padStart(2, '0'), step.time, step.title, step.description]) : steps
  return (<CMSContentBlock cmsBlockKey="FactoryOpenDayProgram">{(
    <section className="ags ags-prog">
      <OpenDayRules />
      <div className="ags-sheet">
        <div className="ags-prog__head">
          <h2 className="ags-prog__title">Программа мероприятия</h2>
        </div>
        <ol className="ags-route">
          {shown.map(([num, time, title, text]) => (
            <li className="ags-route__step" key={num}>
              <span className="ags-route__n">{num}</span>
              <strong className="ags-route__name">{title}</strong>
              <span className="ags-route__dur">{time}</span>
              <p className="ags-route__desc">{text}</p>
            </li>
          ))}
        </ol>
        {!programme?.length && <div className="ags-route__total"><span>Всего</span><b>около 3 часов 5 минут</b></div>}
      </div>
    </section>
  )}</CMSContentBlock>)
}
