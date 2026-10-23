import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Migration aliases remain on the persistent media volume; target access is still checked by Payload.
export async function mediaRedirect(requestURL: string): Promise<Response | null> {
  const url = new URL(requestURL)
  const match = /^\/api\/media\/file\/([^/]+)$/.exec(url.pathname)
  if (!match) return null
  let filename: string
  try { filename = decodeURIComponent(match[1]!) } catch { return null }
  if (path.basename(filename) !== filename) return null
  let aliases: Record<string, string>
  try { aliases = JSON.parse(await readFile(path.resolve(process.env.CMS_MEDIA_DIR || './media', 'webp-redirects.json'), 'utf8')) }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
  const target = aliases[filename]
  if (!target || path.basename(target) !== target || target === filename) return null
  url.pathname = '/api/media/file/' + encodeURIComponent(target)
  return Response.redirect(url, 308)
}
