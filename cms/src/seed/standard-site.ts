import indexJson from '../data/site-index.json'
import { DEFAULT_REGIONAL_SUFFIX } from '../../../src/lib/regional-suffix'

export type SiteDefinition = { key: string; title: string; source: string; exportName: string; kind: 'blocks' | 'forms'; forms: string[] }
export type SitePage = { source: string; components: string[]; redirect: string | null; route: string; title: string; kind: string }
type HomeBlock = { blockType: string } & Record<string, unknown>
type Part = { key: string; title: string; text?: string; textMore?: string; href?: string }

export const siteIndex = indexJson as unknown as { definitions: SiteDefinition[]; pages: SitePage[]; homeBlocks: HomeBlock[] }

const projectTemplate = siteIndex.pages.find(page => page.kind === 'project')
if (!projectTemplate) throw new Error('В индексе сайта нет шаблона проекта')

// One registry row per route. Catalog houses stay out of this list: only the project template is a page.
export const sitePages: SitePage[] = [
  ...siteIndex.pages.filter(page => page.kind !== 'project'),
  { ...projectTemplate, route: '/catalog/[slug]', title: 'Страница проекта', kind: 'template' },
]

export const standardPageImportKeys = new Set(sitePages.map(page => `${page.source}:${page.route}`))
export const standardFormKeys = new Set(siteIndex.definitions.filter(item => item.kind === 'forms').map(item => item.key))

// Header and footer are the only blocks pinned around page content.
const chrome = [
  { key: 'technicalHeader', title: 'Технический хедер', shared: true, parts: [
    { key: 'technicalHeader.region', title: 'Регион' },
    { key: 'technicalHeader.navigation', title: 'Служебная навигация' },
    { key: 'technicalHeader.status', title: 'Режим работы' },
    { key: 'technicalHeader.theme', title: 'Переключатель темы' },
  ] },
  { key: 'mainHeader', title: 'Основной хедер', shared: true, parts: [
    { key: 'mainHeader.logo', title: 'Логотип' },
    { key: 'mainHeader.navigation', title: 'Основная навигация' },
    { key: 'mainHeader.contacts', title: 'Контакты и действия' },
  ] },
  { key: 'footer', title: 'Футер', shared: true, parts: [
    { key: 'footer.navigation', title: 'Навигация' },
    { key: 'footer.contacts', title: 'Контакты' },
    { key: 'footer.legal', title: 'Юридическая информация' },
  ] },
  { key: 'productionSection', title: 'Производство', parts: [
    { key: 'productionSection.heading', title: 'Заголовок' },
    { key: 'productionSection.text', title: 'Текст' },
    { key: 'productionSection.actions', title: 'Кнопки' },
    { key: 'productionSection.media', title: 'Видео' },
    { key: 'productionSection.shops', title: 'Участки цеха' },
  ] },
  { key: 'advantagesBar', title: 'Преимущества', parts: [{ key: 'advantagesBar.items', title: 'Пункты' }] },
  { key: 'popularProjects', title: 'Популярные проекты', parts: [
    { key: 'popularProjects.heading', title: 'Заголовок', text: 'Популярные проекты' },
    { key: 'popularProjects.cards', title: 'Карточки проектов' },
    ...[0, 1, 2, 3, 4, 5].map(index => ({ key: `popularProjects.slot.${index}`, title: `Слот ${index + 1}` })),
    { key: 'popularProjects.button', title: 'Текст кнопки', text: 'Весь каталог' },
  ] },
  { key: 'seriesBento', title: 'Подборки', parts: [
    { key: 'seriesBento.heading', title: 'Заголовок', text: 'Подборки проектов' },
    { key: 'seriesBento.cards', title: 'Подборки' },
    { key: 'seriesBento.slot.0', title: 'Панельно-каркасные дома', text: 'Панельно-каркасные дома', href: 'panel' },
    { key: 'seriesBento.slot.1', title: 'Барнхаусы', text: 'Барнхаусы', href: 'barn' },
    { key: 'seriesBento.slot.2', title: 'Классика', text: 'Классика', href: 'classic' },
    { key: 'seriesBento.slot.3', title: 'Модульные дома', text: 'Модульные дома', href: 'modular' },
    { key: 'seriesBento.button', title: 'Текст кнопки', text: 'Все подборки' },
  ] },
  { key: 'mortgageShowcase', title: 'Ипотека', parts: [
    { key: 'mortgageShowcase.banner', title: 'Семейная ипотека' },
    { key: 'mortgageShowcase.programs', title: 'Программы' },
    { key: 'mortgageShowcase.banks', title: 'Банки' },
  ] },
  { key: 'independentReview', title: 'Независимый обзор', parts: [
    { key: 'independentReview.heading', title: 'Заголовок' },
    { key: 'independentReview.lead', title: 'Текст' },
    { key: 'independentReview.channel', title: 'Канал' },
    { key: 'independentReview.player', title: 'Плеер' },
    { key: 'independentReview.playlist', title: 'Плейлист' },
  ] },
  { key: 'videoTestimonials', title: 'Видеоотзывы', parts: [
    { key: 'videoTestimonials.heading', title: 'Заголовок' },
    { key: 'videoTestimonials.rating', title: 'Рейтинг' },
    { key: 'videoTestimonials.lead', title: 'Текст' },
    { key: 'videoTestimonials.all', title: 'Все истории' },
  ] },
  { key: 'referralProgram', title: 'Реферальная программа', parts: [{ key: 'referralProgram.banner', title: 'Баннер' }] },
  { key: 'contactsSection', title: 'Контакты', parts: [
    { key: 'contactsSection.contacts', title: 'Контакты' },
    { key: 'contactsSection.places', title: 'Площадки' },
  ] },
  // Мероприятие ежемесячное: дата меняется здесь, страница берёт её отсюда.
  { key: 'FactoryOpenDayHero', title: 'День открытых дверей: первый экран', parts: [
    { key: 'openDay.date', title: 'Дата мероприятия', text: '14 ноября' },
  ] },
]

export const chromeByKey = new Map<string, { title: string; shared?: boolean; parts: { key: string; title: string; text?: string; textMore?: string; href?: string }[] }>(chrome.map(item => [item.key, { title: item.title, ...('shared' in item ? { shared: true } : {}), parts: item.parts.map(part => ({ ...part })) }]))
export const standardBlockKeys = new Set([
  ...siteIndex.definitions.filter(item => item.kind === 'blocks').map(item => item.key),
  ...chrome.map(item => item.key),
])

export const heroParts: Part[] = [
  { key: 'hero.background', title: 'Фоновое изображение' },
  { key: 'hero.heading', title: 'Заголовок', text: 'Строим модульные и каркасные дома для жизни и отдыха' },
  { key: 'hero.regionalSuffix', title: 'Региональная приставка', text: DEFAULT_REGIONAL_SUFFIX.nn, textMore: DEFAULT_REGIONAL_SUFFIX.msk },
  { key: 'hero.subtitle', title: 'Подзаголовок', text: 'Через индустриальный подход делаем путь к дому простым и доступным.' },
  { key: 'hero.button', title: 'Кнопка', text: 'Посмотреть проекты домов', href: '/catalog' },
  { key: 'hero.promos', title: 'Слоты быстрых промо' },
  { key: 'hero.promo.0', title: 'Льготная ипотека на дом', text: 'Могут измениться условия по Семейной ипотеке. Успейте получить одобрение по льготным условиям.', textMore: 'До 1 октября 2026 года', href: 'Рассчитать платёж' },
  { key: 'hero.promo.1', title: 'Выставка готовых домов', text: 'Посмотрите готовый дом, оцените планировку и качество материалов. Почувствуйте уют своего дома.', textMore: 'Экскурсия', href: 'Посетить' },
  { key: 'hero.promo.2', title: 'Производство домов', text: 'Расскажем, как изготавливаются конструкции на производстве и как проходит сборка будущего дома.', textMore: 'Завод', href: 'Записаться на экскурсию' },
]

export function isStandardRecord(collection: 'blocks' | 'forms' | 'pages', doc: { key?: string | null; importKey?: string | null }) {
  if (collection === 'pages') return Boolean(doc.importKey && standardPageImportKeys.has(doc.importKey))
  if (collection === 'forms') return Boolean(doc.key && standardFormKeys.has(doc.key))
  return Boolean(doc.key && standardBlockKeys.has(doc.key))
}

// Schema commands and the image build must not open the database just to fill it.
export function shouldSeedSite() {
  if (process.env.CMS_SEED === '0') return false
  if (process.env.NEXT_PHASE === 'phase-production-build') return false
  if (process.env.npm_lifecycle_event === 'build') return false
  if (process.env.DATABASE_URL?.includes('://build:build@')) return false
  return !/migrate|generate:types|generate:importmap/.test(process.argv.join(' '))
}
