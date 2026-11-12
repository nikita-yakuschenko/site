import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb } from 'pdf-lib'

const nonsense = [
  'Площадь: семь вёдер и один тапок',
  'Комнат: сколько влезет, но не все сразу',
  'Стены: картон повышенной мечтательности',
  'Фундамент: на честном слове и двух кирпичах',
  'Крыша: обещала быть где-то рядом',
  'Срок: вчера, если очень попросить',
  'Участок: сразу за радугой, второй поворот',
  'Сборка: силами энтузиазма и соседа',
  'Окна: смотрят в сторону хорошего настроения',
  'Гарантия: пока не расхочется',
]

function pickLines() {
  const pool = [...nonsense]
  const lines = ['Цена: сто тыщ мильёнов']
  while (lines.length < 6 && pool.length) lines.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!)
  return lines
}

export async function jokePassportPdf() {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(await readFile(path.join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf')), { subset: true })
  const page = pdf.addPage([595.28, 841.89])
  const ink = rgb(11 / 255, 16 / 255, 32 / 255)
  const yellow = rgb(252 / 255, 201 / 255, 12 / 255)
  page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: yellow })
  page.drawText('Паспорт проекта', { x: 48, y: 792, size: 28, font, color: ink })
  let y = 700
  for (const line of pickLines()) {
    page.drawText(line, { x: 48, y, size: 18, font, color: ink })
    y -= 36
  }
  return Buffer.from(await pdf.save())
}
