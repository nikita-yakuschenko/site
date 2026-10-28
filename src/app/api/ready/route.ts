import { NextResponse } from 'next/server'
import { requestCMSJSON, decodeCatalog, requestId, recordCMSFailure } from '../../../server/cms-request'

export const dynamic = 'force-dynamic'

// Coalesce public probes and bound their frequency independently of the page Data Cache.
let probe: { origin: string; key: string; until: number; result: Promise<boolean> } | undefined

export async function GET() {
  const id = requestId()
  const key = process.env.CMS_SITE_API_KEY || ''
  const origin = process.env.CMS_PUBLIC_URL || (process.env.NODE_ENV === 'production' ? 'https://cms.avgst.ru' : 'http://localhost:3001')
  if (!probe || probe.origin !== origin || probe.key !== key || Date.now() >= probe.until) {
    const result = key ? requestCMSJSON('catalog.readiness', `${origin}/api/projects/catalog`, {
      headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(2500),
    }, data => {
      decodeCatalog(data)
      return true
    }, { requestId: id, route: '/api/ready' }).catch(() => false) : Promise.resolve(false)
    if (!key) recordCMSFailure('catalog.readiness', 'not-configured', { requestId: id, route: '/api/ready' })
    const current = { origin, key, until: Infinity, result }
    probe = current
    void result.then(() => { current.until = Date.now() + 2000 })
  }
  const ready = await probe.result
  return NextResponse.json({ status: ready ? 'ready' : 'not-ready', buildId: process.env.APP_BUILD_ID || 'unknown' }, {
    status: ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store', 'X-Request-ID': id, ...(!ready ? { 'Retry-After': '2' } : {}) },
  })
}
