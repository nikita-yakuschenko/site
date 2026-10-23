import { access, cp, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

// Used only by Docker's disposable builder. Source files in the repository stay intact.
const root = process.cwd()
const source = path.join(root, 'public')
const target = path.join(root, 'public-runtime')
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/webp-assets.json'), 'utf8'))
for (const stored of Object.values(manifest)) {
  const file = path.resolve(source, '.' + decodeURIComponent(stored))
  if (!file.startsWith(source + path.sep)) throw new Error('Prepared media path is outside public assets')
  await access(file)
}
await mkdir(target) // Fail instead of overwriting an existing directory.
await cp(source, target, {
  recursive: true,
  filter: file => !Object.hasOwn(manifest, '/' + path.relative(source, file).split(path.sep).join('/')),
})
console.log(`Packaged public assets; ${Object.keys(manifest).length} converted source files omitted from runtime`)
