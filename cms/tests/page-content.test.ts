import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { bindMarkedContent, bindReactContent } from '../../src/lib/cms/react-content'

function props(node: ReactNode) { return (node as ReactElement<Record<string, unknown>>).props }

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
