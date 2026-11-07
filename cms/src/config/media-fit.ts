import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Один набор кадров для сайта и любого кабинета. Качество как у загрузки в CMS.
export const MEDIA_FIT_WIDTHS = [384, 828, 1200, 1920] as const

const IMAGE_NAME = /^[^/\\]+\.(?:webp|jpe?g|png|avif)$/i

export function mediaFitTarget(width: string, filename: string): { width: number; sourceName: string } | null {
  const size = Number(width)
  if (!MEDIA_FIT_WIDTHS.includes(size as (typeof MEDIA_FIT_WIDTHS)[number])) return null
  let sourceName: string
  try { sourceName = decodeURIComponent(filename) } catch { return null }
  if (!IMAGE_NAME.test(sourceName) || path.basename(sourceName) !== sourceName) return null
  return { width: size, sourceName }
}

function fitPath(directory: string, width: number, sourceName: string): string {
  const stored = sourceName.replace(/\.[^.]+$/i, '') + '.webp'
  return path.join(directory, 'fit', String(width), stored)
}

function webp(body: Buffer): Response {
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  })
}

// Готовый кадр лежит рядом с исходником. Первый запрос собирает его с диска CMS, дальше файл отдаётся как есть.
export async function mediaFitResponse(directory: string, width: string, filename: string): Promise<Response> {
  const target = mediaFitTarget(width, filename)
  if (!target) return new Response('Некорректный кадр', { status: 400 })
  const cached = fitPath(directory, target.width, target.sourceName)
  try {
    return webp(await readFile(cached))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  let source: Buffer
  try { source = await readFile(path.join(directory, target.sourceName)) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('Нет файла', { status: 404 })
    throw error
  }
  const output = await sharp(source).rotate().resize({ width: target.width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  await mkdir(path.dirname(cached), { recursive: true })
  await writeFile(cached, output)
  return webp(output)
}
