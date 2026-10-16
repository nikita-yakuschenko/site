import { configurationNames, type ConfigurationKey } from '../../../src/lib/catalog/configuration-rules'
import { isPriceKind, priceKinds, type PriceKind } from './price-kinds'

export type PriceInput = { projectSlug: string; projectId?: string; label?: string; configuration: ConfigurationKey; region: PriceKind; price: number }

const priceIdentity = (row: { projectSlug?: string; projectId?: string }) => row.projectId || row.projectSlug || ''

export function parsePriceRows(value: unknown): PriceInput[] {
  if (!Array.isArray(value) || !value.length || value.length > 5000) throw new Error('Нужно от 1 до 5000 строк прайса')
  const seen = new Set<string>()
  return value.map((row, index) => {
    const projectId = row && typeof row === 'object' && typeof row.projectId === 'string' && /^[1-9]\d*$/.test(row.projectId) ? row.projectId : undefined
    const projectSlug = row && typeof row === 'object' && typeof row.projectSlug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.projectSlug) ? row.projectSlug : ''
    const label = row && typeof row === 'object' && typeof row.label === 'string' && row.label.trim() ? row.label.trim() : undefined
    if (!row || typeof row !== 'object' || (!projectId && !projectSlug) || !Object.hasOwn(configurationNames, row.configuration) || !isPriceKind(row.region) || typeof row.price !== 'number' || !Number.isSafeInteger(row.price) || row.price <= 0) throw new Error(`Строка ${index + 1}: укажите проект, комплектацию, тип цены ${priceKinds.map(kind => kind.value).join('/')} и положительную целую цену в рублях`)
    const key = `${priceIdentity({ projectSlug, projectId })}:${row.configuration}:${row.region}`
    if (seen.has(key)) throw new Error(`Строка ${index + 1}: повтор цены ${key}`)
    seen.add(key)
    return { projectSlug, ...(projectId ? { projectId } : {}), ...(label ? { label } : {}), configuration: row.configuration, region: row.region, price: row.price }
  })
}

export function mergePriceRows(groups: PriceInput[][]) {
  const seen = new Map<string, PriceInput>()
  for (const rows of groups) for (const row of rows) seen.set(`${priceIdentity(row)}:${row.configuration}:${row.region}`, row)
  return [...seen.values()]
}

export function parsePriceFile(text: string): PriceInput[] {
  const source = text.replace(/^\uFEFF/, '').trim()
  if (source.startsWith('[') || source.startsWith('{')) {
    const json = JSON.parse(source)
    return parsePriceRows(Array.isArray(json) ? json : json.rows)
  }
  const lines = source.split(/\r?\n/).filter(line => line.trim())
  const delimiter = lines[0]?.includes(';') ? ';' : ','
  const cells = (line: string) => line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''))
  const headings = cells(lines.shift() || '')
  if (headings.join(',') !== 'projectSlug,configuration,region,price') throw new Error('Заголовки CSV: projectSlug;configuration;region;price')
  return parsePriceRows(lines.map(line => { const values = cells(line); if (values.length !== 4) throw new Error('В строке CSV должно быть четыре значения'); return { projectSlug: values[0], configuration: values[1], region: values[2], price: Number(values[3]) } }))
}
