import fs from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
    }),
)
const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000, host: '127.0.0.1' })
await client.connect()
const migrations = await client.query(`select * from payload_migrations order by created_at`)
console.log('MIGRATIONS')
for (const row of migrations.rows) console.log(`${row.batch} ${row.name}`)
const codes = await client.query(`select count(*)::int as projects, count(code)::int as with_code from projects`)
const versions = await client.query(`select count(*)::int as versions, count(version_code)::int as with_code from _projects_v`)
const productCodes = await client.query(`select count(*)::int as n from product_codes`)
console.log(`projects ${codes.rows[0].projects} with_code ${codes.rows[0].with_code}`)
console.log(`versions ${versions.rows[0].versions} with_code ${versions.rows[0].with_code}`)
console.log(`product_codes ${productCodes.rows[0].n}`)
await client.end()
process.exit(0)
const columns = await client.query(`
  select c.relname as table_name, a.attname as column_name, format_type(a.atttypid, a.atttypmod) as typ, a.attnotnull as not_null
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    and (c.relname in ('projects', '_projects_v', 'product_codes', 'pages', 'media') or c.relname like 'projects_%')
  order by c.relname, a.attnum
`)
console.log('COLUMNS')
let current = ''
for (const row of columns.rows) {
  if (row.table_name !== current) { current = row.table_name; console.log(`\n${current}`) }
  console.log(`  ${row.column_name} ${row.typ}${row.not_null ? ' not null' : ''}`)
}
await client.end()
