import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { forgetSecret, saveSettings, settings } from '../automation/store'
import type { MessengerChannel } from './phone'

const fileName = /^[a-z0-9._@+=-]+\.(json|txt)$/i

export function sessionDirectory(channel: MessengerChannel) {
  return path.resolve(process.env.CMS_MESSENGER_DIR || path.join(process.cwd(), 'data', 'messenger-sessions'), channel)
}

export async function restoreSession(payload: Payload, channel: MessengerChannel) {
  const dir = sessionDirectory(channel)
  await mkdir(dir, { recursive: true })
  if ((await listFiles(dir)).length) return dir
  const blob = (await settings(payload)).secret(`messengerSession:${channel}`)
  if (!blob) return dir
  let files: Record<string, string> = {}
  try { files = JSON.parse(blob) as Record<string, string> } catch { return dir }
  for (const [name, body] of Object.entries(files)) {
    if (!fileName.test(name) || typeof body !== 'string') continue
    await writeFile(path.join(dir, name), Buffer.from(body, 'base64'))
  }
  return dir
}

let chain = Promise.resolve()

export function rememberSession(payload: Payload, channel: MessengerChannel) {
  chain = chain.then(() => pack(payload, channel)).catch(error => {
    console.error(`messenger-session ${channel} ${error instanceof Error ? error.name : 'Error'}`)
  })
  return chain
}

async function pack(payload: Payload, channel: MessengerChannel) {
  const files: Record<string, string> = {}
  let total = 0
  for (const name of await listFiles(sessionDirectory(channel))) {
    const body = await readFile(path.join(sessionDirectory(channel), name))
    if (body.length > 2_000_000) continue
    total += body.length
    if (total > 6_000_000) break
    files[name] = body.toString('base64')
  }
  if (!Object.keys(files).length) return
  const saved = await settings(payload)
  await saveSettings(payload, saved.config, { [`messengerSession:${channel}`]: JSON.stringify(files) })
}

export async function clearSession(payload: Payload, channel: MessengerChannel) {
  await rm(sessionDirectory(channel), { recursive: true, force: true })
  await forgetSecret(payload, `messengerSession:${channel}`)
  // webmaxsocket держит вторую копию сессии в cwd/sessions — иначе после «Отключить» поднимается старый токен.
  if (channel === 'max') {
    await rm(path.join(process.cwd(), 'sessions', 'avgst-max.json'), { force: true })
    await rm(path.join(process.cwd(), 'sessions', 'avgst-max.last_ok.json'), { force: true })
  }
}

async function listFiles(dir: string) {
  try { return (await readdir(dir)).filter(name => fileName.test(name)) } catch { return [] }
}
