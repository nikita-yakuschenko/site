export const projectBlockParts: Record<string, { section: string; parts: { key: string; title: string }[] }> = {
  ProjectHeroContent: { section: 'projectHero', parts: [{ key: 'projectHero.image', title: 'Изображения' }, { key: 'projectHero.heading', title: 'Название проекта' }, { key: 'projectHero.specs', title: 'Характеристики' }] },
  ProjectExteriors: { section: 'ProjectExteriors', parts: [{ key: 'ProjectExteriors.heading', title: 'Заголовок' }, { key: 'ProjectExteriors.gallery', title: 'Галерея фасадов' }] },
  ProjectInteriors: { section: 'ProjectInteriors', parts: [{ key: 'ProjectInteriors.heading', title: 'Заголовок' }, { key: 'ProjectInteriors.gallery', title: 'Галерея интерьеров' }] },
  ProjectPlans: { section: 'ProjectPlans', parts: [{ key: 'ProjectPlans.heading', title: 'Заголовок' }, { key: 'ProjectPlans.variants', title: 'Варианты, этажи и экспликация' }] },
  ProjectBuilt: { section: 'ProjectBuilt', parts: [{ key: 'ProjectBuilt.heading', title: 'Заголовок' }, { key: 'ProjectBuilt.gallery', title: 'Фотографии и видео построенных домов' }] },
  ReadyHomeOffer: { section: 'ReadyHomeOffer', parts: [{ key: 'ReadyHomeOffer.configuration', title: 'Комплектация дома' }, { key: 'ReadyHomeOffer.price', title: 'Цена и условия продажи' }] },
  MortgageCalculator: { section: 'MortgageCalculator', parts: [{ key: 'MortgageCalculator', title: 'Комплектации, цены и доступность ипотеки' }] },
  ProjectNextSteps: { section: 'ProjectNextSteps', parts: [{ key: 'ProjectNextSteps.visit', title: 'Посещение дома' }, { key: 'ProjectNextSteps.consult', title: 'Консультация' }, { key: 'ProjectNextSteps.review', title: 'Видеообзор' }] },
  ProjectSimilar: { section: 'ProjectSimilar', parts: [{ key: 'ProjectSimilar.heading', title: 'Заголовок' }, { key: 'ProjectSimilar.projects', title: 'Проекты каталога' }] },
}
