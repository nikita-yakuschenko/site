import Image from 'next/image'

const benefits = [
  ['Пройдитесь по дому', 'Почувствуйте пространство и реальные размеры комнат.'],
  ['Сравните решения', 'Оцените планировки и выберите то, что подходит вашей семье.'],
  ['Посмотрите материалы', 'Рассмотрите фасады, окна, отделку и детали сборки вблизи.'],
  ['Обсудите свой проект', 'Задайте вопросы о доме, комплектации и строительстве.'],
]

export function ExpositionVisit() {
  return (
    <section className="section exposition-visit" aria-labelledby="visit-title">
      <div className="section__inner">
        <div className="exposition-visit__top">
          <div className="exposition-visit__heading"><h2 id="visit-title">Не выбирайте дом<br />по картинке</h2></div>
          <div className="exposition-visit__photo">
            <Image src="/img/pages/exposition-interior.jpg" alt="Гостиная и обеденная зона дома на площадке Высокий Квартал"
              fill sizes="(max-width: 767px) 100vw, 55vw" />
          </div>
        </div>
        <ul className="exposition-benefits">{benefits.map(([title, body]) => (
          <li key={title}><h3>{title}</h3><p>{body}</p></li>
        ))}</ul>
      </div>
    </section>
  )
}
