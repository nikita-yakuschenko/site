import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

export async function listenOptimizationHTTP(handler: (request: Request) => Promise<Response>) {
  const server = createServer(async (incoming: IncomingMessage, outgoing: ServerResponse) => {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk))
      const request = new Request(`http://${incoming.headers.host}${incoming.url}`, { method: incoming.method, headers: incoming.headers as Record<string, string>, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) })
      const response = await handler(request)
      outgoing.statusCode = response.status
      response.headers.forEach((value, key) => { if (key !== 'set-cookie') outgoing.setHeader(key, value) })
      const cookies = response.headers.getSetCookie()
      if (cookies.length) outgoing.setHeader('Set-Cookie', cookies)
      outgoing.end(Buffer.from(await response.arrayBuffer()))
    } catch { outgoing.writeHead(500); outgoing.end('test transport failed') }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  return { origin: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections() }) }
}
