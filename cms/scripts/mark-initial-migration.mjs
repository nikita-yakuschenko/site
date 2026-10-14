import pg from 'pg'

const name = '20261014_074208_initial_record_ids'
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

await client.connect()
const existing = await client.query('select name from payload_migrations order by id')
const names = existing.rows.map(row => row.name)
console.log(`MIGRATIONS:${names.join(',')}`)

if (!names.includes('20261014_094638_pages_drafts')) {
  await client.query('DROP TABLE IF EXISTS "_pages_v_rels", "_pages_v_version_layout", "_pages_v" CASCADE')
  await client.query('ALTER TABLE pages DROP COLUMN IF EXISTS _status')
  await client.query('DROP TYPE IF EXISTS "enum_pages_status", "enum__pages_v_version_kind", "enum__pages_v_version_status"')
  console.log('CLEARED_PARTIAL_PAGES_DRAFTS')
}

if (!names.includes(name)) {
  const batch = await client.query('select coalesce(max(batch), 0) + 1 as next from payload_migrations')
  await client.query(
    'insert into payload_migrations (name, batch, updated_at, created_at) values ($1, $2, now(), now())',
    [name, batch.rows[0].next],
  )
  console.log('MARKED_INITIAL')
}

await client.end()
