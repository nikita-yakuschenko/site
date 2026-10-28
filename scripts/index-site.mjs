import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const relative = file => path.relative(root, file).replaceAll('\\', '/')
async function parse(file) {
  return ts.createSourceFile(file, await fs.readFile(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
function visit(node, callback) { callback(node); ts.forEachChild(node, child => visit(child, callback)) }
function literal(node) { return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined }
function properties(node) {
  const result = {}
  for (const child of ts.isObjectLiteralExpression(node) ? node.properties : []) {
    if (!ts.isPropertyAssignment(child)) continue
    const value = literal(child.initializer) ?? (ts.isNumericLiteral(child.initializer) ? Number(child.initializer.text) : undefined)
    if (value !== undefined) result[child.name.getText().replaceAll(/['"]/g, '')] = value
  }
  return result
}
async function records(file, variable) {
  const source = await parse(path.join(root, file))
  let array
  visit(source, node => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === variable) {
      let value = node.initializer
      while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression
      if (ts.isArrayLiteralExpression(value)) array = value
    }
  })
  if (!array) throw new Error(`Cannot index ${variable}`)
  return array.elements.map(properties)
}
async function files(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat()
}
const copy = (await recordsObject('src/lib/copy.ts', 'copy'))
async function recordsObject(file, variable) {
  const source = await parse(path.join(root, file))
  let result
  visit(source, node => {
    if (ts.isVariableDeclaration(node) && node.name.getText() === variable) {
      let value = node.initializer
      while (ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) value = value.expression
      if (ts.isObjectLiteralExpression(value)) result = properties(value)
    }
  })
  if (!result) throw new Error(`Cannot index ${variable}`)
  return result
}
const projects = await records('src/lib/catalog/projects.ts', 'CATALOG_PROJECTS')
const places = await records('src/lib/exposition.ts', 'EXPOSITION_PLACES')
const mortgage = await records('src/lib/mortgage/routes.ts', 'MORTGAGE_ROUTES')
const definitions = new Map()
const ignoredComponents = new Set(['Link', 'Image', 'SiteChrome', 'ExpositionShell', 'ExpositionPhotoPlaceholder', 'ProjectCard', 'ProjectActions', 'BlockRenderer', 'OpenDayTheme'])
const componentSources = new Map()
for (const file of (await files(path.join(root, 'src/components'))).filter(file => file.endsWith('.tsx'))) componentSources.set(relative(file), await fs.readFile(file, 'utf8'))
function associatedForms(file, visited = new Set()) {
  if (visited.has(file)) return []
  visited.add(file)
  const text = componentSources.get(file)
  if (!text) return []
  const result = []
  if (/<form[\s>]/.test(text)) result.push(file)
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const specifier = literal(statement.moduleSpecifier)
    if (!specifier?.startsWith('.')) continue
    const resolved = relative(path.resolve(root, path.dirname(file), specifier + '.tsx'))
    result.push(...associatedForms(resolved, visited))
  }
  return [...new Set(result)]
}
for (const [file, text] of componentSources) {
  if (!/<form[\s>]/.test(text)) continue
  const exportName = text.match(/export function (\w+)/)?.[1]
  if (exportName) definitions.set(exportName, { key: exportName, title: exportName === 'LeadForm' ? 'Форма заявки' : exportName, source: file, exportName, kind: 'forms', forms: [] })
}
const pages = []
const appFiles = await files(path.join(root, 'src/app'))
for (const file of appFiles.filter(file => /[/\\]page\.tsx$/.test(file)).sort()) {
  const source = await parse(file)
  const route = '/' + relative(file).replace(/^src\/app\//, '').replace(/\/?page\.tsx$/, '').split('/').filter(segment => segment && !segment.startsWith('(')).join('/')
  if (route === '/cms-preview' || route.startsWith('/cms-preview/')) continue
  const components = new Set()
  const imports = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const specifier = literal(statement.moduleSpecifier)
    if (!specifier?.startsWith('.')) continue
    const resolved = relative(path.resolve(path.dirname(file), specifier + '.tsx'))
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) imports.set(element.name.text, { source: resolved, exportName: element.propertyName?.text ?? element.name.text })
  }
  const sections = new Set()
  let title, redirect
  visit(source, node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText()
      if (/^[A-Z]/.test(name) && !name.startsWith('Icon')) components.add(name)
      if (name === 'section') for (const attribute of node.attributes.properties) {
        if (ts.isJsxAttribute(attribute) && attribute.name.getText() === 'id' && literal(attribute.initializer)) sections.add(literal(attribute.initializer))
      }
    }
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'title' && !title) {
      title = literal(node.initializer)
      if (ts.isPropertyAccessExpression(node.initializer) && node.initializer.expression.getText() === 'copy') title = copy[node.initializer.name.text]
    }
    if (ts.isCallExpression(node) && ['permanentRedirect', 'redirect'].includes(node.expression.getText())) redirect = literal(node.arguments[0]) ?? (route === '/mortgage' ? '/family-mortgage' : undefined)
  })
  const base = { source: relative(file), components: [...components], sections: [...sections], redirect: redirect ?? null }
  for (const name of components) {
    const imported = imports.get(name)
    if (!imported || ignoredComponents.has(name) || !componentSources.has(imported.source)) continue
    const forms = associatedForms(imported.source).flatMap(source => [...definitions.values()].filter(definition => definition.kind === 'forms' && definition.source === source).map(definition => definition.key))
    if (!definitions.has(name)) definitions.set(name, { key: name, title: name, ...imported, kind: 'blocks', forms })
  }
  if (route.includes('[')) {
    const data = route === '/catalog/[slug]' ? projects : route === '/exposition/[slug]' ? places : null
    if (!data) throw new Error(`Unresolved dynamic route: ${route}`)
    for (const item of data) {
      if (!item.slug || !item.name) throw new Error(`Missing route data: ${route}`)
      pages.push({ ...base, route: route.replace('[slug]', item.slug), title: item.name, kind: route.startsWith('/catalog') ? 'project' : 'exposition', template: route })
    }
  } else {
    title ??= mortgage.find(item => '/' + item.slug === route)?.title
    if (route === '/factory-open-day') title ??= 'Новый взгляд на загородный дом'
    title ??= ({ '/': 'Главная', '/catalog': copy.catalogTitle, '/mortgage': 'Ипотека', '/for-sale': 'Готовые дома', '/personal-data': copy.personalDataTitle, '/legal/privacy': copy.personalDataTitle, '/legal/cookies': copy.cookiePolicyTitle, '/legal/referral': copy.referralRulesTitle })[route]
    if (!title) throw new Error(`Missing page title: ${route}`)
    pages.push({ ...base, route, title, kind: redirect ? 'redirect' : route.startsWith('/preview/') ? 'preview' : 'page', template: null })
  }
}
const openDayTitles = { FactoryOpenDayHero: 'День открытых дверей: первый экран', FactoryOpenDayProgram: 'День открытых дверей: программа', FactoryOpenDayLocation: 'День открытых дверей: как доехать', FactoryOpenDayForm: 'День открытых дверей: запись', FactoryOpenDayFooter: 'День открытых дверей: подвал' }
for (const [key, title] of Object.entries(openDayTitles)) { const definition = definitions.get(key); if (definition) definition.title = title }
pages.sort((a, b) => a.route.localeCompare(b.route, 'en'))
if (new Set(pages.map(page => page.route)).size !== pages.length) throw new Error('Duplicate routes')
const services = appFiles.filter(file => /[/\\]route\.tsx?$/.test(file)).map(file => ({ route: '/' + relative(file).replace(/^src\/app\//, '').replace(/\/route\.tsx?$/, ''), source: relative(file) })).sort((a, b) => a.route.localeCompare(b.route))
const destination = path.join(root, 'cms/src/data/site-index.json')
await fs.mkdir(path.dirname(destination), { recursive: true })
const homeBlocks = await records('src/lib/home-layout.ts', 'HOME_LAYOUT')
const blockTitles = { hero: 'Главный экран', advantagesBar: 'Преимущества', popularProjects: 'Популярные проекты', seriesBento: 'Серии домов', mortgageShowcase: 'Ипотека', independentReview: 'Независимый обзор', videoTestimonials: 'Видеоотзывы', referralProgram: 'Реферальная программа', textSection: 'Текстовый блок', cta: 'Призыв к действию', productionSection: 'Производство', contactsSection: 'Контакты', leadForm: 'Форма заявки', projectsCatalog: 'Каталог проектов', faq: 'Вопросы и ответы' }
for (const [key, title] of Object.entries(blockTitles)) definitions.set(key, { key, title, source: 'src/components/block-renderer.tsx', exportName: 'BlockRenderer', kind: key === 'leadForm' ? 'forms' : 'blocks', forms: key === 'contactsSection' ? ['LeadForm'] : [] })
await fs.writeFile(destination, JSON.stringify({ pages, projects, services, definitions: [...definitions.values()], homeBlocks }, null, 2) + '\n')
console.log(`Indexed ${pages.length} routes (${projects.length} projects, ${places.length} exposition places), ${services.length} service endpoints`)
