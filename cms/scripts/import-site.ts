import { existsSync } from 'node:fs'
import { createLocalReq, getPayload } from 'payload'
import index from '../src/data/site-index.json'
import { CATALOG_PROJECTS } from '../../src/lib/catalog/projects'
import { tiersForProject } from '../../src/lib/catalog/tiers'
import type { Project } from '../src/payload-types'

if (existsSync('.env')) process.loadEnvFile('.env')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const admins = await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'super-admin' } }, { isBlocked: { equals: false } }] }, limit: 1, overrideAccess: true })
  if (!admins.docs[0]) throw new Error('Для импорта необходим действующий суперадминистратор')
  const req = await createLocalReq({ user: { ...admins.docs[0], collection: 'users' } }, payload)
  const references = new Map<string, { relationTo: 'blocks' | 'forms'; value: number }>()
  let importedProjects = 0
  for (const project of CATALOG_PROJECTS) {
    const importKey = `catalog:${project.slug}`
    const existing = await payload.find({ collection: 'projects', where: { or: [{ importKey: { equals: importKey } }, { slug: { equals: project.slug } }] }, limit: 1, req, overrideAccess: false })
    const tierContent = {
      configurationsImported: true,
      configurations: project.readyHome ? [] : (tiersForProject({ ...project, priceAmount: existing.docs[0]?.priceAmount ?? project.priceAmount }) ?? []).map(tier => ({
        key: tier.id as 'start' | 'standard' | 'project', name: tier.name, price: tier.price, lead: tier.lead, mortgage: tier.mortgage,
        includes: tier.includes.map(text => ({ text })), gifts: tier.gifts?.map(text => ({ text })),
        details: tier.details.map(detail => ({ title: detail.title, lead: detail.lead, items: detail.items?.map(text => ({ text })), groups: detail.groups?.map(group => ({ title: group.title, items: group.items.map(text => ({ text })) })) })),
      })),
    }
    const content: Partial<Project> & Pick<Project, 'recordType'> = {
      contentImported: true, recordType: project.readyHome ? 'ready-home' : 'project',
      technologyBadge: project.technology === 'modular' ? 'Модульный' : 'Панельно-каркасный',
      exteriors: project.exteriors.map(image => ({ image })),
      interiors: project.interiors.map(image => ({ image })),
      floorPlans: project.floorPlans.map(image => ({ image })),
      plans: project.plans, built: project.built, builtTour: project.builtTour,
      about: project.about,
      options: project.options.map(({ id, ...option }) => ({ key: id, ...option })),
      readyHome: project.readyHome ? {
        ...project.readyHome,
        configuration: project.readyHome.configuration?.map(text => ({ text })),
        sections: project.readyHome.sections?.map(section => ({ ...section, points: section.points.map(point => ({ ...point, items: point.items?.map(text => ({ text })) })) })),
      } : undefined,
    }
    if (existing.docs[0]) {
      if (!existing.docs[0].configurationsImported) {
        await payload.update({ collection: 'projects', id: existing.docs[0].id, data: existing.docs[0].configurations?.length ? { configurationsImported: true } : tierContent, req, overrideAccess: false })
      }
      if (!existing.docs[0].contentImported) {
        await payload.update({ collection: 'projects', id: existing.docs[0].id, data: content, req, overrideAccess: false })
        importedProjects++
      }
      continue
    }
    await payload.create({ collection: 'projects', data: {
      importKey, name: project.name, slug: project.slug, description: project.description,
      technologyBadge: project.technologyBadge as Project['technologyBadge'], series: project.series,
      areaValue: project.areaValue, floorsValue: project.floorsValue,
      bedrooms: Number(project.bedrooms), bathrooms: Number(project.bathrooms),
      priceAmount: project.priceAmount, imageUrl: project.imageUrl,
      ...content,
      ...tierContent,
    }, req, overrideAccess: false })
    importedProjects++
  }
  console.log(`Импортировано проектов: ${importedProjects}.`)
  // Import only missing records: existing editorial changes always win.
  for (const kind of ['forms', 'blocks'] as const) {
    for (const definition of index.definitions.filter(item => item.kind === kind)) {
      const existing = await payload.find({ collection: kind, where: { key: { equals: definition.key } }, limit: 1, req, overrideAccess: false })
      const forms = definition.forms.flatMap(key => references.get(key)?.value ?? [])
      const doc = existing.docs[0] ?? await payload.create({ collection: kind, data: { title: definition.title, key: definition.key, source: definition.source, exportName: definition.exportName, ...(kind === 'blocks' ? { forms } : {}) }, req, overrideAccess: false })
      references.set(definition.key, { relationTo: kind, value: doc.id })
    }
  }
  const template = index.pages.find(item => item.kind === 'project')!
  const pages = [...index.pages.filter(item => item.kind !== 'project'), { ...template, route: '/catalog/[slug]', title: 'Страница проекта', kind: 'template' }]
  let created = 0
  for (const page of pages) {
    const importKey = `${page.source}:${page.route}`
    const existing = await payload.find({ collection: 'pages', where: { or: [{ importKey: { equals: importKey } }, { and: [{ source: { equals: page.source } }, { route: { equals: page.route } }] }] }, limit: 1, req, overrideAccess: false })
    if (existing.docs[0] && !existing.docs[0].importKey) await payload.update({ collection: 'pages', id: existing.docs[0].id, data: { importKey }, req, overrideAccess: false })
    if (existing.docs.length) continue
    const layout = page.route === '/'
      ? index.homeBlocks.filter(block => block.blockType !== 'advantagesBar').map(block => ({ component: references.get(block.blockType)!, parameters: block }))
      : page.components.flatMap(key => { const component = references.get(key); return component ? [{ component }] : [] })
    await payload.create({ collection: 'pages', data: { importKey, title: page.title, metaTitle: page.title, route: page.route, kind: page.kind as 'page' | 'template' | 'exposition' | 'redirect' | 'preview', redirect: page.redirect, source: page.source, layout }, req, overrideAccess: false })
    created++
  }
  console.log(`Импортировано страниц: ${created}. Реестр компонентов: ${references.size}.`)
} finally { await payload.destroy() }
process.exit(0)
