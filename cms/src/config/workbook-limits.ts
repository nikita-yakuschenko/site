import { inflateRawSync } from 'node:zlib'
export class WorkbookInputError extends Error {}
const invalid = (): never => { throw new WorkbookInputError('Некорректный XLSX или превышены ограничения размера таблицы.') }
export function validateWorkbookArchive(data: Buffer) {
  if (data.length < 22 || data.length > 2 * 1024 * 1024) invalid()
  let end = -1
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) if (data.readUInt32LE(i) === 0x06054b50 && i + 22 + data.readUInt16LE(i + 20) === data.length) { end = i; break }
  if (end < 0) invalid()
  const count = data.readUInt16LE(end + 10), size = data.readUInt32LE(end + 12), start = data.readUInt32LE(end + 16)
  if (data.readUInt16LE(end + 4) || data.readUInt16LE(end + 6) || count !== data.readUInt16LE(end + 8) || count < 1 || count > 1024 || start + size !== end) invalid()
  let cursor = start, total = 0
  const names = new Set<string>()
  try {
    for (let i = 0; i < count; i++) {
      if (data.readUInt32LE(cursor) !== 0x02014b50) invalid()
      const flags = data.readUInt16LE(cursor + 8), method = data.readUInt16LE(cursor + 10), compressed = data.readUInt32LE(cursor + 20), uncompressed = data.readUInt32LE(cursor + 24)
      const nameLength = data.readUInt16LE(cursor + 28), extra = data.readUInt16LE(cursor + 30), comment = data.readUInt16LE(cursor + 32), local = data.readUInt32LE(cursor + 42)
      const name = data.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
      total += uncompressed
      if (flags & 1 || ![0,8].includes(method) || uncompressed > 16 * 1024 * 1024 || total > 32 * 1024 * 1024 || !name || name.includes('..') || name.startsWith('/') || name.includes('\\') || names.has(name)) invalid()
      names.add(name)
      if (data.readUInt32LE(local) !== 0x04034b50 || data.readUInt16LE(local + 8) !== method) invalid()
      const offset = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28)
      if (offset + compressed > start) invalid()
      const chunk = data.subarray(offset, offset + compressed)
      const actual = method === 8 ? inflateRawSync(chunk, { maxOutputLength: Math.max(1, uncompressed) }) : chunk
      if (actual.length !== uncompressed) invalid()
      cursor += 46 + nameLength + extra + comment
      if (cursor > end) invalid()
    }
    if (cursor !== end || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) invalid()
  } catch { invalid() }
}
