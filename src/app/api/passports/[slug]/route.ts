import { passportToken } from '../../../../lib/passports/access'
import { timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { readyPassport } from '../../../../lib/passports/service'
import { validRegion, validSlug } from '../../../../lib/passports/storage'

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (process.env.PASSPORT_ENABLED !== '1') return new Response(null, { status: 404 })
  const { slug } = await context.params
  const query = new URL(request.url).searchParams
  const region = query.get('region') || ''
  if (!validSlug(slug) || !validRegion(region)) return Response.json({ error: 'invalid-passport' }, { status: 400 })
  const receipt = query.get('receipt') || ''; const expires = query.get('expires') || ''; const token = query.get('token') || ''
  const grant = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`avgst_passport_${receipt}=`))?.split('=')[1] || ''
  if (!/^[a-f0-9]{64}$/.test(grant)) return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(receipt) || !/^\d{13}$/.test(expires) || Number(expires) < Date.now() || Number(expires) > Date.now() + 10 * 60_000 || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token), Buffer.from(passportToken(slug, region, receipt, expires, grant)))) return new Response(null, { status: 403 })
  try {
    const result = await readyPassport(slug, region)
    if (!result.ready) return Response.json({ error: 'passport-preparing' }, { status: 503, headers: { 'Retry-After': '15', 'Cache-Control': 'no-store' } })
    return new Response(await fs.readFile(result.file), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${result.filename}"`, 'Cache-Control': 'private, no-store', ETag: `"${result.fingerprint}"`, 'X-Content-Type-Options': 'nosniff' } })
  } catch (error) {
    const missing = error instanceof Error && /not-found|not-published/.test(error.message)
    return Response.json({ error: missing ? 'passport-not-found' : 'passport-unavailable' }, { status: missing ? 404 : 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '15' } })
  }
}
