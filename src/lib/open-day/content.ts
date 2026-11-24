import type { ContentField } from '../cms/react-content'

export const heroFields: ContentField[] = [
  { key: 'FactoryOpenDayHero.content.format', kind: 'text', title: 'Формат мероприятия', text: "День открытых дверей" },
  { key: 'FactoryOpenDayHero.content.heading', kind: 'text', title: 'Заголовок', text: "Новый взгляд\nна загородный дом" },
  { key: 'FactoryOpenDayHero.content.subtitle', kind: 'text', title: 'Подзаголовок', text: "Какие дома будут строить в этом сезоне?" },
  { key: 'FactoryOpenDayHero.content.intro', kind: 'text', title: 'Вступление после даты', text: "разберём архитектурные тренды, цветовые решения, актуальные планировки и проекты, а главное — покажем, как они воплощаются в готовом доме." },
  { key: 'FactoryOpenDayHero.content.cta', kind: 'text', title: 'Текст кнопки', text: "Записаться" },
  { key: 'FactoryOpenDayHero.content.free', kind: 'text', title: 'Подпись под кнопкой', text: "Бесплатно, по записи" },
  { key: 'FactoryOpenDayHero.content.caption', kind: 'text', title: 'Подпись к фотографии', text: "Выставочный дом «Авангард Строй», Нижний Новгород" },
  { key: 'FactoryOpenDayHero.content.alt', kind: 'text', title: 'Описание фотографии', text: "Гости в выставочном доме «Авангард Строй»" },
  { key: 'FactoryOpenDayHero.content.benefit1Title', kind: 'text', title: 'Преимущество 1', text: "Узнайте, как строится ваш будущий дом" },
  { key: 'FactoryOpenDayHero.content.benefit1Text', kind: 'text', title: 'Описание преимущества 1', text: "Покажем производство и технологии, которые используем." },
  { key: 'FactoryOpenDayHero.content.benefit2Title', kind: 'text', title: 'Преимущество 2', text: "Почувствуете себя как дома" },
  { key: 'FactoryOpenDayHero.content.benefit2Text', kind: 'text', title: 'Описание преимущества 2', text: "Посетите выставочные дома, сравните планировки и выпейте согревающий глинтвейн." },
  { key: 'FactoryOpenDayHero.content.benefit3Title', kind: 'text', title: 'Преимущество 3', text: "Познакомитесь с трендами загородной архитектуры" },
  { key: 'FactoryOpenDayHero.content.benefit3Text', kind: 'text', title: 'Описание преимущества 3', text: "Архитектор расскажет о последних тенденциях, цветовых решениях и актуальных проектах 2027 года." },
  { key: 'FactoryOpenDayHero.content.benefit4Title', kind: 'text', title: 'Преимущество 4', text: "Сколько стоит свой дом в 2027?" },
  { key: 'FactoryOpenDayHero.content.benefit4Text', kind: 'text', title: 'Описание преимущества 4', text: "Разберём изменения на рынке ИЖС, условия по ипотеке и ежемесячный платёж." },
  { key: 'FactoryOpenDayHero.content.photo.image', kind: 'image', title: 'Фотография первого экрана', image: '/factory-open-day/hero.webp' },
]

export const locationFields: ContentField[] = [
  { key: 'FactoryOpenDayLocation.content.heading', kind: 'text', title: 'Заголовок', text: "Как доехать" },
  { key: 'FactoryOpenDayLocation.content.route', kind: 'text', title: 'Кнопка маршрута', text: "Построить маршрут" },
  { key: 'FactoryOpenDayLocation.content.point', kind: 'text', title: 'Кнопка точки на карте', text: "Открыть точку на карте" },
  { key: 'FactoryOpenDayLocation.content.addressLabel', kind: 'text', title: 'Подпись адреса', text: 'Адрес' },
  { key: 'FactoryOpenDayLocation.content.landmarkLabel', kind: 'text', title: 'Подпись ориентира', text: 'Ориентир' },
  { key: 'FactoryOpenDayLocation.content.dateLabel', kind: 'text', title: 'Подпись даты', text: 'Дата' },
]

export const formFields: ContentField[] = [
  { key: 'FactoryOpenDayForm.content.heading', kind: 'text', title: 'Заголовок перед датой', text: "До встречи" },
  { key: 'FactoryOpenDayForm.content.note', kind: 'text', title: 'Описание регистрации', text: "Участие бесплатное, по записи. Заполните форму справа или ниже, мы пришлём программу мероприятия и напоминание накануне" },
  { key: 'FactoryOpenDayForm.content.dialogAction', kind: 'text', title: 'Заголовок окна регистрации', text: "Записаться" },
  { key: 'FactoryOpenDayForm.content.dialogEvent', kind: 'text', title: 'Мероприятие в заголовке окна', text: "День открытых дверей" },
  { key: 'FactoryOpenDayForm.content.submit', kind: 'text', title: 'Кнопка отправки', text: "Записаться" },
  { key: 'FactoryOpenDayForm.content.nameLabel', kind: 'text', title: 'Подпись поля имени', text: 'Имя' },
  { key: 'FactoryOpenDayForm.content.phoneLabel', kind: 'text', title: 'Подпись поля телефона', text: 'Телефон' },
  { key: 'FactoryOpenDayForm.content.emailLabel', kind: 'text', title: 'Подпись поля email', text: 'Email' },
  { key: 'FactoryOpenDayForm.content.successTitle', kind: 'text', title: 'Заголовок после отправки', text: 'Вы записаны на день открытых дверей!' },
  { key: 'FactoryOpenDayForm.content.successText', kind: 'text', title: 'Текст после отправки', text: 'Программу мероприятия и напоминание накануне пришлём на почту, указанную при регистрации.' },
]

export const footerFields: ContentField[] = [
  { key: 'FactoryOpenDayFooter.content.contact', kind: 'text', title: 'Заголовок контактов', text: "Связь" },
  { key: 'FactoryOpenDayFooter.content.social', kind: 'text', title: 'Заголовок соцсетей', text: "Соцсети" },
  { key: 'FactoryOpenDayFooter.content.factory', kind: 'text', title: 'Заголовок адреса', text: "Производство" },
  { key: 'FactoryOpenDayFooter.content.cta', kind: 'text', title: 'Текст кнопки перед датой', text: "Записаться на" },
  { key: 'FactoryOpenDayFooter.content.privacy', kind: 'text', title: 'Подпись ссылки на политику', text: "Политика конфиденциальности" },
  { key: 'FactoryOpenDayFooter.content.email', kind: 'text', title: 'Email', text: "info@avgst.ru" },
]

export const openDayContent = {
  FactoryOpenDayHero: heroFields,
  FactoryOpenDayLocation: locationFields,
  FactoryOpenDayForm: formFields,
  FactoryOpenDayFooter: footerFields,
}
