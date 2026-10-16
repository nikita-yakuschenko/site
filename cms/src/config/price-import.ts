import { configurationNames, type ConfigurationKey } from '../../../src/lib/catalog/configuration-rules'
import { isPriceKind, priceKinds, type PriceKind } from './price-kinds'

export type PriceInput = { projectSlug: string; configuration: ConfigurationKey; region: PriceKind; price: number }
export function parsePriceRows(value: unknown): PriceInput[] {
  if (!Array.isArray(value) || !value.length || value.length > 5000) throw new Error('Нужно от 1 до 5000 строк прайса')
  const seen = new Set<string>()
  return value.map((row, index) => {
    if (!row || typeof row !== 'object' || typeof row.projectSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.projectSlug) || !Object.hasOwn(configurationNames, row.configuration) || !isPriceKind(row.region) || typeof row.price !== 'number' || !Number.isSafeInteger(row.price) || row.price <= 0) throw new Error(`Строка ${index + 1}: укажите адрес проекта, комплектацию, тип цены ${priceKinds.map(kind => kind.value).join('/')} и положительную целую цену в рублях`)
    const key = `${row.projectSlug}:${row.configuration}:${row.region}`
    if (seen.has(key)) throw new Error(`Строка ${index + 1}: повтор цены ${key}`)
    seen.add(key)
    return { projectSlug: row.projectSlug, configuration: row.configuration, region: row.region, price: row.price }
  })
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
