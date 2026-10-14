import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { createLocalReq, getPayload } from 'payload'
if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const shared = [
  { key: 'technicalHeader', title: 'Технический хедер', parts: [{ key: 'technicalHeader.region', title: 'Регион' }, { key: 'technicalHeader.navigation', title: 'Служебная навигация' }, { key: 'technicalHeader.status', title: 'Режим работы' }, { key: 'technicalHeader.theme', title: 'Переключатель темы' }] },
  { key: 'mainHeader', title: 'Основной хедер', parts: [{ key: 'mainHeader.logo', title: 'Логотип' }, { key: 'mainHeader.navigation', title: 'Основная навигация' }, { key: 'mainHeader.contacts', title: 'Контакты и действия' }] },
  { key: 'footer', title: 'Футер', parts: [{ key: 'footer.navigation', title: 'Навигация' }, { key: 'footer.contacts', title: 'Контакты' }, { key: 'footer.legal', title: 'Юридическая информация' }] },
  { key: 'productionSection', title: 'Производство', parts: [{ key: 'productionSection.heading', title: 'Заголовок' }, { key: 'productionSection.text', title: 'Текст' }, { key: 'productionSection.actions', title: 'Кнопки' }, { key: 'productionSection.media', title: 'Видео' }, { key: 'productionSection.shops', title: 'Участки цеха' }] },
  { key: 'advantagesBar', title: 'Преимущества', parts: [{ key: 'advantagesBar.items', title: 'Пункты' }] },
  { key: 'popularProjects', title: 'Популярные проекты', parts: [{ key: 'popularProjects.heading', title: 'Заголовок' }, { key: 'popularProjects.cards', title: 'Карточки проектов' }, ...[0, 1, 2, 3, 4, 5].map(index => ({ key: `popularProjects.slot.${index}`, title: `Слот ${index + 1}` })), { key: 'popularProjects.button', title: 'Текст кнопки' }] },
  { key: 'seriesBento', title: 'Подборки', parts: [{ key: 'seriesBento.heading', title: 'Заголовок' }, { key: 'seriesBento.cards', title: 'Подборки' }, ...[0, 1, 2, 3].map(index => ({ key: `seriesBento.slot.${index}`, title: ['Панельно-каркасные дома', 'Барнхаусы', 'Классика', 'Модульные дома'][index] || 'Подборка' })), { key: 'seriesBento.button', title: 'Текст кнопки' }] },
  { key: 'mortgageShowcase', title: 'Ипотека', parts: [{ key: 'mortgageShowcase.banner', title: 'Семейная ипотека' }, { key: 'mortgageShowcase.programs', title: 'Программы' }, { key: 'mortgageShowcase.banks', title: 'Банки' }] },
  { key: 'independentReview', title: 'Независимый обзор', parts: [{ key: 'independentReview.heading', title: 'Заголовок' }, { key: 'independentReview.lead', title: 'Текст' }, { key: 'independentReview.channel', title: 'Канал' }, { key: 'independentReview.player', title: 'Плеер' }, { key: 'independentReview.playlist', title: 'Плейлист' }, { key: 'independentReview.video.0', title: 'Норвегия 115' }, { key: 'independentReview.video.1', title: 'Барнхаус 113' }, { key: 'independentReview.video.2', title: 'Симпл 49' }, { key: 'independentReview.video.3', title: 'Производство домов' }] },
  { key: 'videoTestimonials', title: 'Видеоотзывы', parts: [{ key: 'videoTestimonials.heading', title: 'Заголовок' }, { key: 'videoTestimonials.rating', title: 'Рейтинг' }, { key: 'videoTestimonials.lead', title: 'Текст' }, { key: 'videoTestimonials.all', title: 'Все истории' }, { key: 'videoTestimonials.story.0', title: 'Симпл 57' }, { key: 'videoTestimonials.story.1', title: 'Симпл 49' }, { key: 'videoTestimonials.story.2', title: 'Модульный отель' }] },
  { key: 'referralProgram', title: 'Реферальная программа', parts: [{ key: 'referralProgram.banner', title: 'Баннер' }] },
  { key: 'contactsSection', title: 'Контакты', parts: [{ key: 'contactsSection.contacts', title: 'Контакты' }, { key: 'contactsSection.places', title: 'Площадки' }] },
  { key: 'projectHero', title: 'Главный экран проекта', parts: [{ key: 'projectHero.image', title: 'Изображение' }, { key: 'projectHero.heading', title: 'Название' }, { key: 'projectHero.specs', title: 'Характеристики' }] },
  { key: 'ProjectExteriors', title: 'Рендеры фасадов', parts: [{ key: 'ProjectExteriors.heading', title: 'Заголовок' }, { key: 'ProjectExteriors.gallery', title: 'Галерея' }] },
  { key: 'ProjectInteriors', title: 'Рендеры интерьеров', parts: [{ key: 'ProjectInteriors.heading', title: 'Заголовок' }, { key: 'ProjectInteriors.gallery', title: 'Галерея' }] },
  { key: 'ProjectPlans', title: 'Планировки', parts: [{ key: 'ProjectPlans.heading', title: 'Заголовок' }, { key: 'ProjectPlans.variants', title: 'Варианты' }] },
  { key: 'ProjectBuilt', title: 'Построенные дома', parts: [{ key: 'ProjectBuilt.heading', title: 'Заголовок' }] },
  { key: 'ProjectConfig', title: 'Комплектации', parts: [{ key: 'ProjectConfig.heading', title: 'Заголовок' }, { key: 'ProjectConfig.tiers', title: 'Уровни комплектации' }] },
  { key: 'ProjectSimilar', title: 'Похожие проекты', parts: [{ key: 'ProjectSimilar.heading', title: 'Заголовок' }] },
]
async function usesChrome(source: string, visited = new Set<string>()): Promise<boolean> {
  if (visited.has(source)) return false
  visited.add(source)
  let text: string
  try { text = await readFile(path.resolve('..', source), 'utf8') } catch { return false }
  if (/<SiteChrome[\s>]/.test(text)) return true
  for (const match of text.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const file = path.posix.normalize(path.posix.join(path.posix.dirname(source), `${match[1]}.tsx`))
    if (await usesChrome(file, visited)) return true
  }
  return false
}
try {
  const admin = (await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'super-admin' } }, { isBlocked: { equals: false } }] }, limit: 1 })).docs[0]
  if (!admin) throw new Error('Нет действующего суперадминистратора')
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload)
  const ids = new Map<string, string>()
  for (const definition of shared) {
    const existing = (await payload.find({ collection: 'blocks', where: { key: { equals: definition.key } }, limit: 1, req, overrideAccess: false })).docs[0]
    const doc = existing || await payload.create({ collection: 'blocks', data: { ...definition, source: 'src/components/site-chrome.tsx', exportName: 'SiteChrome', defaults: { shared: true } }, req, overrideAccess: false })
    ids.set(definition.key, doc.id)
  }
  const hero = (await payload.find({ collection: 'blocks', where: { key: { equals: 'hero' } }, limit: 1, req, overrideAccess: false })).docs[0]
  const promos: { key: string; title: string }[] = []
  const copySource = ts.createSourceFile('copy.ts', await readFile('../src/lib/copy.ts', 'utf8'), ts.ScriptTarget.Latest, true)
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(copySource) === 'heroPromos' && ts.isArrayLiteralExpression(node.initializer)) {
      node.initializer.elements.forEach((element, index) => {
        if (!ts.isObjectLiteralExpression(element)) return
        const heading = element.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(copySource) === 'heading')
        if (heading && ts.isPropertyAssignment(heading) && ts.isStringLiteral(heading.initializer)) promos.push({ key: `hero.promo.${index}`, title: heading.initializer.text })
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(copySource)
  const seriesSeed: Record<string, { text: string; href?: string }> = {
    'seriesBento.heading': { text: 'Подборки проектов' },
    'seriesBento.button': { text: 'Все подборки' },
    'seriesBento.slot.0': { text: 'Панельно-каркасные дома', href: 'panel' },
    'seriesBento.slot.1': { text: 'Барнхаусы', href: 'barn' },
    'seriesBento.slot.2': { text: 'Классика', href: 'classic' },
    'seriesBento.slot.3': { text: 'Модульные дома', href: 'modular' },
  }
  for (const chrome of shared) {
    const existing = (await payload.find({ collection: 'blocks', where: { key: { equals: chrome.key } }, limit: 1, req, overrideAccess: false })).docs[0]
    if (!existing) continue
    const current = existing.parts || []
    const parts = chrome.parts.map(part => {
      const stored = current.find(item => item.key === part.key)
      if (stored) {
        const titled = part.key === 'popularProjects.button' || part.key === 'seriesBento.button' ? { ...stored, title: part.title } : stored
        const seed = seriesSeed[part.key]
        if (seed) {
          const next = { ...titled, text: titled.text || seed.text }
          return seed.href ? { ...next, href: titled.href || seed.href } : next
        }
        return titled.text || part.key !== 'popularProjects.heading' && part.key !== 'popularProjects.button' ? titled : { ...titled, text: part.key === 'popularProjects.heading' ? 'Популярные проекты' : 'Весь каталог' }
      }
      const seed = seriesSeed[part.key]
      if (seed) return { ...part, text: seed.text, ...(seed.href ? { href: seed.href } : {}) }
      if (part.key === 'popularProjects.heading') return { ...part, text: 'Популярные проекты' }
      if (part.key === 'popularProjects.button') return { ...part, text: 'Весь каталог' }
      return part
    })
    const same = current.length === parts.length && current.every((item, index) => item.key === parts[index].key && item.title === parts[index].title)
    const data: { parts?: typeof parts; title?: string } = {}
    if (!same) data.parts = parts
    if (chrome.key === 'seriesBento' && existing.title !== chrome.title) data.title = chrome.title
    if (data.parts || data.title) await payload.update({ collection: 'blocks', id: existing.id, data, req, overrideAccess: false })
  }
  if (hero) {
    const content: Record<string, { text: string; textMore?: string; href?: string }> = {
      'hero.heading': { text: 'Строим модульные и каркасные дома для жизни и отдыха', textMore: '' },
      'hero.subtitle': { text: 'Через индустриальный подход делаем путь к дому простым и доступным.' },
      'hero.button': { text: 'Посмотреть проекты домов', href: '/catalog' },
      'hero.promo.0': { textMore: 'До 1 октября 2026 года', text: 'Могут измениться условия по Семейной ипотеке. Успейте получить одобрение по льготным условиям.', href: 'Рассчитать платёж' },
      'hero.promo.1': { textMore: 'Экскурсия', text: 'Посмотрите готовый дом, оцените планировку и качество материалов. Почувствуйте уют своего дома.', href: 'Посетить' },
      'hero.promo.2': { textMore: 'Завод', text: 'Расскажем, как изготавливаются конструкции на производстве и как проходит сборка будущего дома.', href: 'Записаться на экскурсию' },
    }
    const order = [{ key: 'hero.background', title: 'Фоновое изображение' }, { key: 'hero.heading', title: 'Заголовок' }, { key: 'hero.subtitle', title: 'Подзаголовок' }, { key: 'hero.button', title: 'Кнопка' }, { key: 'hero.promos', title: 'Слоты быстрых промо' }, ...promos]
    const current = new Map((hero.parts || []).map(part => [part.key, part]))
    const parts = [...order.map(part => { const existing = current.get(part.key); return existing ? { ...existing, title: part.key === 'hero.background' ? part.title : existing.title } : part }), ...(hero.parts || []).filter(part => !order.some(item => item.key === part.key))]
    const filled = parts.map(part => content[part.key] && !('text' in part && part.text) ? { ...part, ...content[part.key] } : part)
    await payload.update({ collection: 'blocks', id: hero.id, data: { parts: filled }, req, overrideAccess: false })
  }
  let changed = 0
  const nextStepsExisting = (await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectNextSteps' } }, limit: 1, req, overrideAccess: false })).docs[0]
  const nextStepsParts = [...(nextStepsExisting?.parts || [])]
  for (const part of [{ key: 'ProjectNextSteps.visit', title: 'Посмотрите дом вживую' }, { key: 'ProjectNextSteps.consult', title: 'Консультация с архитектором' }, { key: 'ProjectNextSteps.review', title: 'Обзор готового дома' }]) if (!nextStepsParts.some(existing => existing.key === part.key)) nextStepsParts.push(part)
  const nextStepsData = { title: nextStepsExisting && nextStepsExisting.title !== 'ProjectNextSteps' ? nextStepsExisting.title : 'Просмотр дома и консультация', parts: nextStepsParts }
  const nextSteps = nextStepsExisting ? await payload.update({ collection: 'blocks', id: nextStepsExisting.id, data: nextStepsData, req, overrideAccess: false }) : await payload.create({ collection: 'blocks', data: { key: 'ProjectNextSteps', source: 'src/components/project-next-steps.tsx', exportName: 'ProjectNextSteps', ...nextStepsData }, req, overrideAccess: false })
  const similarExisting = (await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectSimilar' } }, limit: 1, req, overrideAccess: false })).docs[0]
  const similar = similarExisting || await payload.create({ collection: 'blocks', data: { key: 'ProjectSimilar', title: 'Похожие проекты', source: 'src/components/project-similar.tsx', exportName: 'ProjectSimilar' }, req, overrideAccess: false })
  if (similar.title === 'ProjectSimilar') await payload.update({ collection: 'blocks', id: similar.id, data: { title: 'Похожие проекты' }, req, overrideAccess: false })
  const calculator = (await payload.find({ collection: 'blocks', where: { key: { equals: 'MortgageCalculator' } }, limit: 1, req, overrideAccess: false })).docs[0]
    || await payload.create({ collection: 'blocks', data: { key: 'MortgageCalculator', title: 'Ипотечный калькулятор', source: 'src/components/mortgage-calculator.tsx', exportName: 'MortgageCalculator' }, req, overrideAccess: false })
  if (calculator.title === 'MortgageCalculator') await payload.update({ collection: 'blocks', id: calculator.id, data: { title: 'Ипотечный калькулятор' }, req, overrideAccess: false })
  const projectConfig = (await payload.find({ collection: 'blocks', where: { key: { equals: 'ProjectConfig' } }, limit: 1, req, overrideAccess: false })).docs[0]
  if (projectConfig?.title === 'ProjectConfig') await payload.update({ collection: 'blocks', id: projectConfig.id, data: { title: 'Комплектации' }, req, overrideAccess: false })
  for (const page of (await payload.find({ collection: 'pages', pagination: false, depth: 0, req, overrideAccess: false })).docs) {
    if (!page.source || !await usesChrome(page.source)) continue
    const layout = [...(page.layout || [])]
    if (page.source === 'src/app/catalog/[slug]/page.tsx') {
      const rowID = (row: typeof layout[number]) => row.component.relationTo === 'blocks' ? typeof row.component.value === 'object' ? row.component.value.id : row.component.value : null
      if (!layout.some(row => rowID(row) === nextSteps.id)) {
        const position = layout.findIndex(row => rowID(row) === projectConfig?.id)
        layout.splice(position >= 0 ? position + 1 : layout.length, 0, { component: { relationTo: 'blocks', value: nextSteps.id } })
        await payload.update({ collection: 'pages', id: page.id, data: { layout }, req, overrideAccess: false })
        changed++
      }
      const previous = layout.find(row => rowID(row) === calculator.id)
      const similarPosition = layout.findIndex(row => rowID(row) === similar.id)
      const nextStepsPosition = layout.findIndex(row => rowID(row) === nextSteps.id)
      if (similarPosition !== nextStepsPosition + 1) {
        const similarRow = similarPosition >= 0 ? layout.splice(similarPosition, 1)[0] : { component: { relationTo: 'blocks' as const, value: similar.id } }
        layout.splice(layout.findIndex(row => rowID(row) === nextSteps.id) + 1, 0, similarRow)
        await payload.update({ collection: 'pages', id: page.id, data: { layout }, req, overrideAccess: false })
        changed++
      }
      const calculatorIndex = layout.findIndex(row => rowID(row) === calculator.id)
      const configIndex = layout.findIndex(row => rowID(row) === projectConfig?.id)
      if (calculatorIndex < 0 || configIndex >= 0 && calculatorIndex !== configIndex - 1) {
        if (calculatorIndex >= 0) layout.splice(calculatorIndex, 1)
        const target = layout.findIndex(row => rowID(row) === projectConfig?.id)
        layout.splice(target >= 0 ? target : layout.length, 0, previous || { component: { relationTo: 'blocks', value: calculator.id }, parameters: { showMatches: false, initialProgramId: 'family', recordType: 'project', priceSource: 'configurations.standard.price', mortgageEligibilitySource: 'configurations.mortgage' } })
        await payload.update({ collection: 'pages', id: page.id, data: { layout }, req, overrideAccess: false })
        changed++
      }
      if (!layout.some(row => rowID(row) === calculator.id)) throw new Error('В шаблоне проекта отсутствует ипотечный калькулятор')
      console.log('Шаблон проекта: ипотечный калькулятор зарегистрирован перед комплектациями.')
    }
    const contains = (id: string) => layout.some(row => row.component.relationTo === 'blocks' && (typeof row.component.value === 'object' ? row.component.value.id : row.component.value) === id)
    const before = ['technicalHeader', 'mainHeader'].filter(key => !contains(ids.get(key)!)).map(key => ({ component: { relationTo: 'blocks' as const, value: ids.get(key)! } }))
    const after = contains(ids.get('footer')!) ? [] : [{ component: { relationTo: 'blocks' as const, value: ids.get('footer')! } }]
    if (before.length || after.length) { await payload.update({ collection: 'pages', id: page.id, data: { layout: [...before, ...layout, ...after] }, req, overrideAccess: false }); changed++ }
  }
  console.log(`Оболочка добавлена на ${changed} страниц. Состав главного экрана зарегистрирован.`)
} finally { await payload.destroy() }
process.exit(0)
