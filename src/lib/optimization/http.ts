/** Byte limit applies while streaming, before JSON.parse or allocating the full body. */
export async function boundedOptimizationJson(request: { body?: ReadableStream<Uint8Array> | null }, limit: number): Promise<unknown> {
  if (!request.body) throw new Error('bad_json')
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); throw new Error('body_size') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const all = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all)) } catch { throw new Error('bad_json') }
}
export function optimizationRateLimiter(limit = 60) {
  const buckets = new Map<string, { count: number; until: number }>()
  return (key: string, now = Date.now()) => {
    for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id)
    const bucket = buckets.get(key)
    if (bucket) { if (bucket.count >= limit) return false; bucket.count++; return true }
    if (buckets.size >= 2048) return false
    buckets.set(key, { count: 1, until: now + 60_000 }); return true
  }
}
