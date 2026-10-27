import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { requestIdentity, requestPolicies, type RequestScope } from '../../../src/lib/request-limits'
import { RequestLimitError } from '../../../src/lib/request-security'
export async function checkRequestLimit(payload: Payload, scope: RequestScope, identity: string) {
  const policy = requestPolicies[scope], now = Date.now()
  const key = `${scope}:${Math.floor(now / policy.windowMs)}:${identity}`
  const expires = new Date(now + policy.windowMs * 2).toISOString()
  const db = payload.db as unknown as { drizzle: { execute: (query: ReturnType<typeof sql>) => Promise<{rows:{hits:number}[]}> } }
  const globalKey = `${scope}:${Math.floor(now / policy.windowMs)}:global`
  const global = await db.drizzle.execute(sql`INSERT INTO request_limits (key,hits,expires_at) VALUES (${globalKey},1,${expires}) ON CONFLICT (key) DO UPDATE SET hits=request_limits.hits+1 WHERE request_limits.hits < ${policy.limit * 100} RETURNING hits`)
  if (!global.rows.length) throw new RequestLimitError(429, 'too-many-attempts')
  const result = await db.drizzle.execute(sql`INSERT INTO request_limits (key,hits,expires_at) VALUES (${key},1,${expires}) ON CONFLICT (key) DO UPDATE SET hits=request_limits.hits+1 WHERE request_limits.hits < ${policy.limit} RETURNING hits`)
  // A bounded cleanup also runs on denied requests; no retained per-IP JS map.
  if (Math.random() < 0.05) await db.drizzle.execute(sql`DELETE FROM request_limits WHERE id IN (SELECT id FROM request_limits WHERE expires_at < now() ORDER BY expires_at LIMIT 1000)`)
  if (!result.rows.length) throw new RequestLimitError(429, 'too-many-attempts')
}
export async function requireCMSRequestLimit(payload: Payload, request: {headers:Headers}, scope: RequestScope) {
  await checkRequestLimit(payload, scope, requestIdentity(request, process.env.PAYLOAD_SECRET!))
}
