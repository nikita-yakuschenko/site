export class RequestLimitError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}
export async function readTextLimited(request: { headers: Headers; body?: ReadableStream<Uint8Array> | null }, maxBytes: number): Promise<string> {
  const length = Number(request.headers.get('content-length'))
  if (Number.isFinite(length) && length > maxBytes) throw new RequestLimitError(413, 'request-too-large')
  if (!request.body) return ''
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) { await reader.cancel(); throw new RequestLimitError(413, 'request-too-large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const data = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder().decode(data)
}
export async function readJsonLimited(request: { headers: Headers; body?: ReadableStream<Uint8Array> | null }, maxBytes = 64 * 1024): Promise<unknown> {
  try { return JSON.parse(await readTextLimited(request, maxBytes)) }
  catch (error) { if (error instanceof RequestLimitError) throw error; throw new RequestLimitError(400, 'invalid-json') }
}
