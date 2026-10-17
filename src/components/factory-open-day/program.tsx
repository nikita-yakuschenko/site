import { OpenDayRules } from './rules'

const steps = [
  ['01', 'Встреча гостей', '10 минут', 'Знакомство и инструктаж.'],
  ['02', 'Экскурсия по цехам', '45 минут', 'От отбора материалов до готового дома.'],
  ['03', 'Трансфер на выставочную площадку', '15 минут', 'Переезд между площадками.'],
  ['04', 'Кофе-брейк', '15 минут', 'Неформальное общение с экспертами.'],
  ['05', 'Прогулка по будущему дому', '30 минут', 'Почувствуйте реальные размеры и сравните планировочные решения.'],
  ['06', 'Консультация архитектора', '20–25 минут', 'От анализа участка до посадки дома — всё, что важно знать перед строительством. Здесь же презентация о компании.'],
  ['07', 'Открытый диалог', '15 минут', 'Ответы на любые вопросы.'],
  ['08', 'Трансфер на производственную площадку', '15 минут', 'При необходимости.'],
] as const

export function FactoryOpenDayProgram() {
  return <section className="ags ags-prog">
    <OpenDayRules />
    <div className="ags-sheet">
      <header className="ags-prog__head"><h2 className="ags-prog__title">Программа мероприятия</h2></header>
      <ol className="ags-route">
        {steps.map(([number, name, duration, text]) => <li className="ags-route__step" key={number}>
          <span className="ags-route__n">{number}</span>
          <h3 className="ags-route__name">{name}</h3>
          <span className="ags-route__dur">{duration}</span>
          <p className="ags-route__desc">{text}</p>
        </li>)}
      </ol>
      <div className="ags-route__total"><span>Всего</span><b>около 2 часов 50 минут</b></div>
    </div>
  </section>
}
