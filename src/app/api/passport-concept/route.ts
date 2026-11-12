import { isValidRuMobile } from '../../../lib/phone'
import { readyPassport } from '../../../lib/passports/service'
import { passportToken } from '../../../lib/passports/access'
import { validRegion, validSlug } from '../../../lib/passports/storage'
import { randomBytes } from 'node:crypto'
import { passportSkipsLead, planPassportDownload, notePassportDownload, type PassportSignal } from '../../../lib/leads'

function enabled() { return process.env.PASSPORT_ENABLED === '1' }
function cookieValue(header: string | null, name: string) {
  const prefix = `${name}=`
  return (header || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length) || ''
}
function passportSignal(request: Request, input: { dwellMs?: unknown; leftFast?: unknown }): { signal: PassportSignal; freshDevice: boolean } {
  const existing = cookieValue(request.headers.get('cookie'), 'avgst_passport_device')
  const device = /^[a-f0-9]{32}$/.test(existing) ? existing : randomBytes(16).toString('hex')
  const dwellMs = typeof input.dwellMs === 'number' && input.dwellMs >= 0 && input.dwellMs <= 30 * 60 * 1000 ? input.dwellMs : 30 * 60 * 1000
  return { signal: { device, dwellMs, leftFast: input.leftFast === true }, freshDevice: device !== existing }
}
export async function POST(request: Request) {
  if (!enabled()) return new Response(null, { status: 404 })
  const input = await request.json().catch(() => null)
  if (!input || typeof input.phone !== 'string' || !isValidRuMobile(input.phone) || typeof input.slug !== 'string' || !validSlug(input.slug) || !validRegion(input.region) || !/^[a-f0-9-]{36}$/.test(input.requestId || '')) return Response.json({ error: 'invalid-input' }, { status: 400 })
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { signal, freshDevice } = passportSignal(request, input)
  const plan = planPassportDownload(address, signal)
  if (plan === 'banned') return Response.json({ error: 'passport-banned' }, { status: 429 })
  try {
    const document = await readyPassport(input.slug, input.region)
    if (!document.ready) return Response.json({ error: 'passport-preparing' }, { status: 503, headers: { 'Retry-After': '15' } })
    const local = process.env.NODE_ENV === 'development' && process.env.CMS_PUBLIC_URL === 'http://localhost:3001'
    let receiptId = ''
    let lead = false
    if (!passportSkipsLead(address, signal)) {
      const cms = new URL(local ? '/api/passport-concept' : '/api/lead-submissions/submit', process.env.CMS_PUBLIC_URL)
      const payload = local ? input : { requestId: input.requestId, phone: input.phone,
        siteId: 'avgst', formId: 'project-passport', consent: true,
        sourceUrl: `https://avgst.ru/catalog/${input.slug}`, sourcePath: `/catalog/${input.slug}`,
        message: `Скачать паспорт проекта: ${document.projectName}`,
        meta: { project: input.slug, projectName: document.projectName, region: input.region, action: 'project-passport' } }
      const result = await fetch(cms, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CMS_SITE_API_KEY}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) })
      if (!result.ok) return Response.json({ error: 'not-saved' }, { status: 502 })
      const receipt = await result.json()
      if (receipt.accepted !== true || !receipt.id) return Response.json({ error: 'not-saved' }, { status: 502 })
      receiptId = String(receipt.id)
      lead = true
    } else receiptId = randomBytes(16).toString('hex')
    const expires = String(Date.now() + 5 * 60_000)
    const grant = randomBytes(32).toString('hex')
    const mode = plan === 'joke' ? 'joke' : 'real'
    const query = new URLSearchParams({ region: input.region, receipt: receiptId, expires, mode, token: passportToken(input.slug, input.region, receiptId, expires, grant, mode) })
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
    notePassportDownload(address, signal)
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    headers.append('Set-Cookie', `avgst_passport_${receiptId}=${grant}; Path=/api/passports/; HttpOnly; SameSite=Strict; Max-Age=300${secure}`)
    if (freshDevice) headers.append('Set-Cookie', `avgst_passport_device=${signal.device}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`)
    return Response.json({ accepted: true, id: receiptId, lead, pace: plan, filename: document.filename, downloadUrl: `/api/passports/${input.slug}?${query}` }, { headers })
  } catch { return Response.json({ error: 'passport-unavailable' }, { status: 503 }) }
}
