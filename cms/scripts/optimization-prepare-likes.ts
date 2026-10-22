import pg from 'pg'
import { drizzle } from '@payloadcms/db-postgres/drizzle/node-postgres'
import { captureLikeBaseline } from '../src/optimization/likes'
import { optimizationFlags } from '../src/optimization/flags'

// No Payload config/onInit import and no writes unless explicitly --apply.
const apply = process.argv.includes('--apply')
const version = process.argv.find(a => a.startsWith('--version='))?.slice('--version='.length)
if (apply && (!version || !/^[A-Za-z0-9._-]{1,120}$/.test(version))) throw new Error('--apply requires --version=<reconciliation-version>')
if (apply && optimizationFlags().preferences) throw new Error('Prepare baselines before enabling canonical preference writes')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
await client.connect()
try {
  const result = await client.query(`SELECT p.code,p.like_count,COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.like_voters)='array' THEN p.like_voters ELSE '[]'::jsonb END),0) AS keys,b.project_id AS prepared FROM projects p LEFT JOIN project_like_baselines b ON b.project_id=p.id WHERE p.code IS NOT NULL ORDER BY p.id`)
  if (!apply) console.log(JSON.stringify({ mode: 'dry-run', projects: result.rowCount, prepared: result.rows.filter(r => r.prepared != null).length, projects_with_votes: result.rows.filter(r => Number(r.like_count) > 0 || Number(r.keys) > 0).length }))
  else {
    const db = drizzle(client)
    let prepared = 0, existing = 0
    await db.transaction(async tx => {
      for (const row of result.rows) {
        const status = await captureLikeBaseline(tx, row.code, version!)
        if (status === 'prepared') prepared++; else existing++
      }
    })
    console.log(JSON.stringify({ mode: 'applied', prepared, existing, version }))
  }
} finally { await client.end() }
