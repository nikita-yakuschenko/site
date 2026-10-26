import { readFile, mkdir, writeFile } from 'node:fs/promises'

const counter = '96524478'
const token = process.env.METRIKA_ACCESS_TOKEN
if (!token) throw new Error('METRIKA_ACCESS_TOKEN is required')
const definitions = JSON.parse(await readFile(new URL('../src/lib/metrica-goals.json', import.meta.url), 'utf8'))
const endpoint = `https://api-metrika.yandex.net/management/v1/counter/${counter}/goals`
async function api(method, body) {
  const response = await fetch(endpoint, {
    method,
    headers: { Authorization: `OAuth ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`Metrika ${method}: HTTP ${response.status}`)
  return response.json()
}
const before = (await api('GET')).goals
const apply = process.argv.includes('--apply')
if (apply) {
  await mkdir(new URL('../output/', import.meta.url), { recursive: true })
  await writeFile(new URL(`../output/metrica-goals-before-${Date.now()}.json`, import.meta.url), JSON.stringify(before, null, 2))
}
for (const definition of definitions) {
  const existing = before.find(goal => goal.type === 'action' && goal.conditions?.some(condition => condition.type === 'exact' && condition.url === definition.event))
  if (existing) {
    console.log(`Exists: ${definition.event} (${existing.id})`)
    continue
  }
  if (!apply) {
    console.log(`Would create: ${definition.event} — ${definition.name}`)
    continue
  }
  const { goal } = await api('POST', { goal: {
    name: definition.name,
    type: 'action',
    conditions: [{ type: 'exact', url: definition.event }],
  } })
  console.log(`Created: ${definition.event} (${goal.id})`)
}
if (apply) {
  const after = (await api('GET')).goals
  if (before.some(goal => !after.some(saved => saved.id === goal.id))) throw new Error('Existing goal missing after verification')
  for (const definition of definitions) {
    if (!after.some(goal => goal.type === 'action' && goal.conditions?.some(condition => condition.type === 'exact' && condition.url === definition.event))) throw new Error(`Goal not verified: ${definition.event}`)
  }
  console.log(`Verified ${definitions.length} event goals. Preserved all ${before.length} existing goals.`)
}
