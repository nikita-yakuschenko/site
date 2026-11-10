import { readFile, mkdir, writeFile } from 'node:fs/promises'

const counter = '96524478'
const token = process.env.METRIKA_ACCESS_TOKEN
if (!token) throw new Error('METRIKA_ACCESS_TOKEN is required')
const definitions = JSON.parse(await readFile(new URL('../src/lib/metrica-goals.json', import.meta.url), 'utf8'))
const root = `https://api-metrika.yandex.net/management/v1/counter/${counter}`

async function api(method, path, body) {
  const response = await fetch(root + path, {
    method,
    headers: { Authorization: `OAuth ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Metrika ${method} ${path}: HTTP ${response.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : {}
}

function matches(goal, event) {
  return goal.type === 'action' && goal.conditions?.some(condition => condition.type === 'exact' && condition.url === event)
}

const before = (await api('GET', '/goals')).goals
const apply = process.argv.includes('--apply')
if (apply) {
  await mkdir(new URL('../output/', import.meta.url), { recursive: true })
  await writeFile(new URL(`../output/metrica-goals-before-${Date.now()}.json`, import.meta.url), JSON.stringify(before, null, 2))
}

for (const definition of definitions) {
  const existing = before.find(goal => matches(goal, definition.event))
  if (!existing) {
    if (!apply) {
      console.log(`Would create: ${definition.event} - ${definition.name}`)
      continue
    }
    const { goal } = await api('POST', '/goals', { goal: {
      name: definition.name,
      type: 'action',
      conditions: [{ type: 'exact', url: definition.event }],
    } })
    console.log(`Created: ${definition.event} (${goal.id})`)
    continue
  }
  if (existing.name === definition.name) {
    console.log(`Exists: ${definition.event} (${existing.id})`)
    continue
  }
  if (!apply) {
    console.log(`Would rename ${existing.id}: ${existing.name} -> ${definition.name}`)
    continue
  }
  await api('PUT', `/goal/${existing.id}`, { goal: {
    id: existing.id,
    name: definition.name,
    type: existing.type,
    conditions: existing.conditions,
    is_retargeting: existing.is_retargeting ?? 0,
  } })
  console.log(`Renamed: ${definition.event} (${existing.id})`)
}

if (apply) {
  const after = (await api('GET', '/goals')).goals
  if (before.some(goal => !after.some(saved => saved.id === goal.id))) throw new Error('Existing goal missing after verification')
  for (const definition of definitions) {
    const saved = after.find(goal => matches(goal, definition.event))
    if (!saved || saved.name !== definition.name) throw new Error(`Goal not verified: ${definition.event}`)
  }
  console.log(`Verified ${definitions.length} event goals. Preserved all ${before.length} existing goals.`)
}
