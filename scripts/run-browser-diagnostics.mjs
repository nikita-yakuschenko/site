import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const target = process.argv[2] === 'production' ? 'production' : 'local'
const suite = process.argv[3] === 'release' ? ['--grep', '@critical'] : []
const cli = fileURLToPath(new URL('../node_modules/playwright/cli.js', import.meta.url))
const child = spawn(process.execPath, [cli, 'test', '-c', 'playwright.diagnostics.config.ts', ...suite, ...process.argv.slice(4)], {
  stdio: 'inherit',
  env: { ...process.env, DIAG_TARGET: target },
})
child.on('error', error => { console.error(error); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
