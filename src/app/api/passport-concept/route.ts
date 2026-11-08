import { isValidRuMobile } from '../../../lib/phone'
import { readyPassport } from '../../../lib/passports/service'
import { passportToken } from '../../../lib/passports/access'
import { validRegion, validSlug } from '../../../lib/passports/storage'
import { randomBytes } from 'node:crypto'

function enabled() { return process.env.PASSPORT_ENABLED === '1' }
export async function POST(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 })
  const input = await request.json().catch(() => null)
  if (!input || typeof input.phone !== 'string' || !isValidRuMobile(input.phone) || typeof input.slug !== 'string' || !validSlug(input.slug) || !validRegion(input.region)) return Response.json({ error: 'invalid-input' }, { status: 400 })
  try {
    const document = await readyPassport(input.slug, input.region)
    if (!document.ready) return Response.json({ error: 'passport-preparing' }, { status: 503, headers: { 'Retry-After': '15' } })
    const local = process.env.NODE_ENV === 'development' && process.env.CMS_PUBLIC_URL === 'http://localhost:3001'
    const cms = new URL(local ? '/api/passport-concept' : '/api/lead-submissions/submit', process.env.CMS_PUBLIC_URL)
    const payload = local ? input : { requestId: input.requestId, name: 'Запрос паспорта проекта', phone: input.phone,
      siteId: 'avgst', formId: 'project-passport', consent: true,
      sourceUrl: `https://avgst.ru/catalog/${input.slug}`, sourcePath: `/catalog/${input.slug}`,
      message: `Скачать паспорт проекта: ${input.slug}`,
      meta: { project: input.slug, region: input.region, action: 'project-passport' } }
    const result = await fetch(cms, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) })
    if (!result.ok) return Response.json({ error: 'not-saved' }, { status: 502 })
    const receipt = await result.json()
    if (receipt.accepted !== true || !receipt.id) return Response.json({ error: 'not-saved' }, { status: 502 })
    const expires = String(Date.now() + 5 * 60_000)
    const grant = randomBytes(32).toString('hex')
    const query = new URLSearchParams({ region: input.region, receipt: receipt.id, expires, token: passportToken(input.slug, input.region, receipt.id, expires, grant) })
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
    return Response.json({ accepted: true, id: receipt.id, filename: document.filename, downloadUrl: `/api/passports/${input.slug}?${query}` }, { headers: { 'Cache-Control': 'no-store',
      'Set-Cookie': `avgst_passport_${receipt.id}=${grant}; Path=/api/passports/; HttpOnly; SameSite=Strict; Max-Age=300${secure}` } })
  } catch { return Response.json({ error: 'passport-unavailable' }, { status: 503 }) }
}
