import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { bindMarkedContent, bindReactContent, findCMSContentRecord } from '../../src/lib/cms/react-content'
import { countCollectionProjects } from '../../src/lib/catalog/collection'

function props(node: ReactNode) { return (node as ReactElement<Record<string, unknown>>).props }

test('server and client use the same scoped CMS record before rendering saved content', () => {
  const global = { key: 'Example', parts: [{ key: 'Example.content.0.children', text: 'Общий текст' }] }
  const scoped = { key: 'Example-page-home', scope: '/', parts: [{ key: 'Example-page-home.content.0.children', text: 'Текст главной' }] }
  const other = { key: 'Example-page-about', scope: '/about', parts: [] }
  const records = [global, other, scoped]
  assert.equal(findCMSContentRecord(records, 'Example', '/'), scoped)
  assert.equal(findCMSContentRecord(records, 'Example', '/catalog'), global)
  const original = createElement('p', null, 'Исходный текст')
  const selected = findCMSContentRecord(records, 'Example', '/')!
  assert.equal(props(bindReactContent(selected.key, original, selected.parts).content).children, 'Текст главной')
  assert.equal(findCMSContentRecord([other], 'Example', '/'), undefined)
})

test('CMS block copy cannot overwrite records owned by the stories collection after reordering', () => {
  const card = (story: { slug: string; heading: string; poster: string; place: string }) => createElement('div', { 'data-cms-content-connected': true, story })
  const family = { slug: 'family', heading: 'Жизнь в доме', poster: '/family.jpg', place: 'Нижегородская область' }
  const hotel = { slug: 'hotel', heading: 'Модульный отель', poster: '/hotel.jpg', place: 'Дзержинск' }
  const tree = createElement('section', null, [card(family), card(hotel)])
  const saved = [
    { key: 'VideoTestimonials.content.0.children.0.prop.story.heading', text: hotel.heading },
    { key: 'VideoTestimonials.content.0.children.1.prop.story.heading', text: family.heading },
  ]
  const result = bindReactContent('VideoTestimonials', tree, saved)
  const children = props(result.content).children as ReactNode[]
  assert.deepEqual(props(children[0]).story, family)
  assert.deepEqual(props(children[1]).story, hotel)
  assert.equal(result.fields.some(field => field.key.includes('.story.')), false)
})

test('collection counts follow current catalog records and distinguish technology from series', () => {
  const items = [{ technology: 'panel', series: 'barn' }, { technology: 'modular', series: 'barn' }, { technology: 'panel', series: 'classic' }]
  assert.equal(countCollectionProjects(items, 'panel'), 2)
  assert.equal(countCollectionProjects(items, 'barn'), 2)
  assert.equal(countCollectionProjects(items, 'modular'), 1)
  assert.equal(countCollectionProjects([...items, { technology: 'modular', series: 'classic' }], 'modular'), 2)
  assert.equal(countCollectionProjects(items.slice(1), 'panel'), 1)
})

test('a calculated badge cannot be overwritten by saved generic text', () => {
  const badge = (count: string) => createElement('span', { 'data-cms-content-connected': true }, count)
  const saved = [{ key: 'Card.content.0.children', text: '1 проект' }]
  assert.deepEqual(bindReactContent('Card', badge('26 проектов'), saved).fields, [])
  assert.equal(props(bindReactContent('Card', badge('26 проектов'), saved).content).children, '26 проектов')
  assert.equal(props(bindReactContent('Card', badge('27 проектов'), saved).content).children, '27 проектов')
})

test('saved copy, links and images replace their own fields without changing handlers or the source tree', () => {
  const onClick = () => 'clicked'
  const original = createElement('section', null, createElement('h2', null, 'Исходный заголовок'), createElement('a', { href: '/before', onClick }, 'Перейти'), createElement('img', { src: '/before.jpg', srcSet: '/before.jpg 1x', alt: 'Дом' }))
  const initial = bindReactContent('Example', original)
  const title = initial.fields.find(field => field.text === 'Исходный заголовок')!
  const link = initial.fields.find(field => field.kind === 'link')!
  const image = initial.fields.find(field => field.kind === 'image')!
  const next = bindReactContent('Example', original, [{ key: title.key, text: 'Новый заголовок' }, { key: link.key, href: '/after' }, { key: image.key, image: '/after.webp' }])
  const children = props(next.content).children as ReactNode[]
  assert.equal(props(children[0]).children, 'Новый заголовок')
  assert.equal(props(children[1]).href, '/after')
  assert.equal(props(children[1]).onClick, onClick)
  assert.equal(props(children[2]).src, '/after.webp')
  assert.equal(props(children[2]).srcSet, undefined)
  assert.equal(props((props(original).children as ReactNode[])[0]).children, 'Исходный заголовок')
})

test('an explicitly empty text is retained and records from another block cannot overwrite it', () => {
  const original = createElement('p', null, 'Текст')
  const field = bindReactContent('A', original).fields[0]!
  assert.equal(props(bindReactContent('A', original, [{ key: field.key, text: '' }]).content).children, '')
  assert.equal(props(bindReactContent('B', original, [{ key: field.key, text: 'Чужой текст' }]).content).children, 'Текст')
})

test('nested connected blocks own their fields and are not edited twice by their parent', () => {
  const Child = ({ title }: { title: string }) => createElement('h2', null, title)
  const original = createElement('section', null, createElement(Child, { title: 'Свой редактор', 'data-cms-content-connected': true } as { title: string }))
  assert.deepEqual(bindReactContent('Parent', original).fields, [])
})

test('data passed to an existing card remains editable without changing the record identity', () => {
  const Card = ({ story }: { story: { id: string; title: string; poster: string } }) => createElement('p', null, story.title)
  const original = createElement(Card, { story: { id: 'record-1', title: 'Старое название', poster: '/old.jpg' } })
  const initial = bindReactContent('Stories', original)
  const title = initial.fields.find(field => field.text === 'Старое название')!
  const poster = initial.fields.find(field => field.kind === 'image')!
  const next = bindReactContent('Stories', original, [{ key: title.key, text: 'Новая история' }, { key: poster.key, image: '/new.webp' }])
  assert.deepEqual(props(next.content).story, { id: 'record-1', title: 'Новая история', poster: '/new.webp' })
})

test('static server copy keeps stable field markers for the same preview updates', () => {
  const initial = bindReactContent('Legal', createElement('p', null, 'Исходный абзац'), [], true)
  const key = initial.fields[0]!.key
  const next = bindMarkedContent(initial.content, [{ key, text: 'Изменённый абзац' }])
  assert.equal(props(props(next).children as ReactNode).children, 'Изменённый абзац')
})


test('adding a named event format preserves existing positional bindings and supports clearing', () => {
  const heading = createElement('h1', null, 'Старый заголовок')
  const original = bindReactContent('Event', createElement('section', null, [heading]))
  const format = createElement('p', { 'data-cms-content-field': 'eventFormat', 'data-cms-content-label': 'Формат мероприятия' }, 'День открытых дверей')
  const tree = createElement('section', null, [format, heading])
  const result = bindReactContent('Event', tree, [{ key: original.fields[0].key, text: 'Сохранённый заголовок' }, { key: 'Event.content.eventFormat', text: 'Экскурсия' }])
  assert.equal(result.fields[1].key, original.fields[0].key)
  assert.equal(result.fields[0].title, 'Формат мероприятия')
  const children = props(result.content).children as ReactNode[]
  assert.equal(props(children[0]).children, 'Экскурсия')
  assert.equal(props(children[1]).children, 'Сохранённый заголовок')
  const cleared = bindReactContent('Event', tree, [{ key: 'Event.content.eventFormat', text: '' }])
  assert.equal(props((props(cleared.content).children as ReactNode[])[0]).children, '')
})
