import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resolvePassportData } from '../../src/lib/passports/resolver'
import { validRegion } from '../../src/lib/passports/storage'
const [slug, region, output] = process.argv.slice(2)
if (!slug || !region || !validRegion(region) || !output) throw new Error('Usage: snapshot.ts slug nn|msk output.json')
const data = await resolvePassportData(slug, region)
await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true })
await fs.writeFile(output, JSON.stringify(data, null, 2))
console.log(JSON.stringify({ slug, region, variants: data.plans.length, rows: data.comparison.rows.length, rooms: data.plans.flatMap(v => v.floors.flatMap(f => f.rooms)).length, output }))
