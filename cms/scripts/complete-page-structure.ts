import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import { createLocalReq, getPayload } from 'payload'
if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const shared = [
  { key: 'technicalHeader', title: 'Технический хедер', parts: [{ key: 'technicalHeader.region', title: 'Регион' }, { key: 'technicalHeader.navigation', title: 'Служебная навигация' }, { key: 'technicalHeader.status', title: 'Режим работы' }] },
  { key: 'mainHeader', title: 'Основной хедер', parts: [{ key: 'mainHeader.logo', title: 'Логотип' }, { key: 'mainHeader.navigation', title: 'Основная навигация' }, { key: 'mainHeader.contacts', title: 'Контакты и действия' }] },
  { key: 'footer', title: 'Футер', parts: [{ key: 'footer.navigation', title: 'Навигация' }, { key: 'footer.contacts', title: 'Контакты' }, { key: 'footer.legal', title: 'Юридическая информация' }] },
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
  const ids = new Map<string, number>()
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
  if (hero) {
    const parts = [...(hero.parts || [])]
    for (const part of [{ key: 'hero.heading', title: 'Заголовок' }, { key: 'hero.subtitle', title: 'Подзаголовок' }, { key: 'hero.button', title: 'Кнопка' }, { key: 'hero.promos', title: 'Слоты быстрых промо' }, ...promos]) if (!parts.some(existing => existing.key === part.key)) parts.push(part)
    await payload.update({ collection: 'blocks', id: hero.id, data: { parts }, req, overrideAccess: false })
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
    const contains = (id: number) => layout.some(row => row.component.relationTo === 'blocks' && (typeof row.component.value === 'object' ? row.component.value.id : row.component.value) === id)
    const before = ['technicalHeader', 'mainHeader'].filter(key => !contains(ids.get(key)!)).map(key => ({ component: { relationTo: 'blocks' as const, value: ids.get(key)! } }))
    const after = contains(ids.get('footer')!) ? [] : [{ component: { relationTo: 'blocks' as const, value: ids.get('footer')! } }]
    if (before.length || after.length) { await payload.update({ collection: 'pages', id: page.id, data: { layout: [...before, ...layout, ...after] }, req, overrideAccess: false }); changed++ }
  }
  console.log(`Оболочка добавлена на ${changed} страниц. Состав главного экрана зарегистрирован.`)
} finally { await payload.destroy() }
process.exit(0)
