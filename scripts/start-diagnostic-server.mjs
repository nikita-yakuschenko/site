import { existsSync, mkdirSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')
if (!existsSync(join(standalone, 'server.js'))) {
  throw new Error('Build the production app first: npm run build')
}
mkdirSync(join(standalone, '.next'), { recursive: true })
for (const [source, target] of [
  [join(root, '.next', 'static'), join(standalone, '.next', 'static')],
  [join(root, 'public'), join(standalone, 'public')],
]) {
  if (!existsSync(target)) symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir')
}
process.env.PORT = '3000'
process.env.HOSTNAME = '127.0.0.1'
await import('../.next/standalone/server.js')
