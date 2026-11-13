import { timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { readyPassport } from '../../../../../lib/passports/service'
import { validRegion, validSlug } from '../../../../../lib/passports/storage'

function authorized(request: Request) {
  const expected = process.env.CMS_SITE_API_KEY || ''
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!expected || !token || expected.length !== token.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

// Внутренняя выдача PDF для CMS: паспорт крепится в сделку Битрикс, а не скачивается посетителем.
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (process.env.PASSPORT_ENABLED !== '1') return new Response(null, { status: 404 })
  if (!authorized(request)) return new Response(null, { status: 401 })
  const { slug } = await context.params
  const region = new URL(request.url).searchParams.get('region') || ''
  if (!validSlug(slug) || !validRegion(region)) return Response.json({ error: 'invalid-passport' }, { status: 400 })
  try {
    const result = await readyPassport(slug, region)
    if (!result.ready) return Response.json({ error: 'passport-preparing' }, { status: 503, headers: { 'Retry-After': '15', 'Cache-Control': 'no-store' } })
    return new Response(await fs.readFile(result.file), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'private, no-store',
        ETag: `"${result.fingerprint}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Passport-Filename': result.filename,
      },
    })
  } catch (error) {
    const missing = error instanceof Error && /not-found|not-published/.test(error.message)
    return Response.json({ error: missing ? 'passport-not-found' : 'passport-unavailable' }, { status: missing ? 404 : 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } })
  }
}
