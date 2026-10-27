import assert from 'node:assert/strict'
import test from 'node:test'
import { randomBytes } from 'node:crypto'
import { checkRequestLimit } from '../../src/config/request-limits'
import { sql } from '@payloadcms/db-postgres'

test('distributed request counters enforce atomic limits across concurrent requests', {skip:process.env.CMS_HARDENING_TEST_DATABASE!=='true'},async()=>{
 assert.ok(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
 process.env.CMS_MAINTENANCE='1';process.env.CMS_SEED='0';process.env.PAYLOAD_DB_PUSH='false'
 const {getPayload}=await import('payload'),{default:config}=await import('../../src/payload.config')
 const p=await getPayload({config}),identity=randomBytes(32).toString('hex')
 try{
  const result=await Promise.allSettled(Array.from({length:12},()=>checkRequestLimit(p,'lead',identity)))
  assert.equal(result.filter(r=>r.status==='fulfilled').length,5)
  assert.equal(result.filter(r=>r.status==='rejected').length,7)
  const db=p.db as unknown as {drizzle:{execute:(q:ReturnType<typeof sql>)=>Promise<unknown>}}
  await db.drizzle.execute(sql`DELETE FROM request_limits WHERE key LIKE ${`lead:%:${identity}`}`)
 }finally{await p.destroy()}
})
