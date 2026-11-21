type Tag = { name: string; markup: string }
type Break = { start: number; end: number; parents: Tag[] }

const voidTags = new Set(['br', 'img', 'hr'])
const headingPattern = /^h[2-4]$/
const conclusionPattern = /^(?:заключение|вывод(?:ы)?|итог(?:и)?|резюме|подвед[её]м итог)/i
const faqPattern = /^(?:ответы на вопросы|часто задаваемые вопросы|вопросы и ответы|faq)(?:\s|$|[:.!?])/i

export function splitArticleBody(html: string) {
  const parents: Tag[] = []
  const breaks: Break[] = []
  let intro: Break | undefined
  let conclusion: Break | undefined
  let faq: Break | undefined
  let hasText = false
  let lineBreak: Break | undefined
  let heading: (Break & { name: string; text: string }) | undefined

  for (const token of html.matchAll(/<(\/)?([a-z][\w-]*)(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?\s*\/?>|[^<]+|</gi)) {
    const [markup, closing, tag] = token
    const start = token.index
    const end = start + markup.length
    const name = tag?.toLowerCase()
    if (!name) {
      if (heading) heading.text += markup
      if (markup.replace(/&(?:nbsp|#160);/gi, '').trim()) {
        hasText = true
        lineBreak = undefined
      }
      continue
    }

    if (closing) {
      if (parents.at(-1)?.name !== name) continue
      parents.pop()
      if (heading?.name === name) {
        const text = heading.text.replace(/&(?:nbsp|#160);/gi, ' ').trim()
        if (!faq && faqPattern.test(text)) faq = heading
        if (!conclusion && !faq && conclusionPattern.test(text)) conclusion = heading
        heading = undefined
      } else if (hasText && (name === 'p' || name === 'div') && parents.every(parent => parent.name === 'div')) {
        intro ??= { start: end, end, parents: [...parents] }
      }
      continue
    }

    if (headingPattern.test(name) && parents.every(parent => parent.name === 'div')) {
      heading = { name, text: '', start, end: start, parents: [...parents] }
    }
    if (!faq && name === 'dl' && /class=["'][^"']*\bjournal-faq\b/.test(markup)) {
      faq = { start, end: start, parents: [...parents] }
    }
    if (name === 'br' && hasText && !intro && parents.every(parent => parent.name === 'div' || parent.name === 'p')) {
      if (lineBreak && !html.slice(lineBreak.end, start).trim()) {
        intro = { ...lineBreak, end }
      } else {
        lineBreak = { start, end, parents: [...parents] }
      }
    } else if (!voidTags.has(name)) {
      parents.push({ name, markup })
    }
  }

  const tail = conclusion ?? faq
  if (intro && (!tail || intro.end < tail.start)) breaks.push(intro)
  if (conclusion) breaks.push(conclusion)
  if (faq) breaks.push(faq)
  const chunks: string[] = []
  let offset = 0
  let prefix = ''
  for (const cut of breaks) {
    const suffix = [...cut.parents].reverse().map(parent => `</${parent.name}>`).join('')
    chunks.push(prefix + html.slice(offset, cut.start) + suffix)
    prefix = cut.parents.map(parent => parent.markup).join('')
    offset = cut.end
  }
  chunks.push(prefix + html.slice(offset))

  return {
    intro: breaks[0] === intro ? chunks.shift() ?? '' : '',
    main: chunks.shift() ?? '',
    conclusion: conclusion ? chunks.shift() ?? '' : '',
    faq: faq ? chunks.shift() ?? '' : '',
  }
}
